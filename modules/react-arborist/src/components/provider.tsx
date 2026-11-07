import {
  ReactNode,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { FixedSizeList, VariableSizeList } from "react-window";
import { createStore, Store } from "redux";
import {
  DndContext as DndKitContext,
  DragCancelEvent,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { UniqueIdentifier } from "@dnd-kit/core";
import { DataUpdatesContext, DndContext, NodesContext, TreeApiContext } from "../context.js";

import { TreeApi } from "../interfaces/tree-api.js";
import { initialState } from "../state/initial.js";
import { Actions, rootReducer, RootState } from "../state/root-reducer.js";
import { actions as visibility } from "../state/open-slice.js";
import { TreeProps } from "../types/tree-props.js";
import { treeCollisionDetection } from "./collision-detection.js";
import { useDragHandlers } from "../dnd/use-drag-handlers.js";
import { OUTER_DROP_ID } from "../dnd/outer-drop-hook.js";

type Props<T> = {
  treeProps: TreeProps<T>;
  imperativeHandle: React.Ref<TreeApi<T> | undefined>;
  children: ReactNode;
};

const SERVER_STATE = initialState();

const MOUSE_SENSOR_OPTIONS = {
  activationConstraint: {
    distance: 5,
  },
};

/* Touch needs a delay rather than a distance: a distance constraint would
   start dragging as soon as the finger moves, which fights the list scrolling.
   Holding still for a moment drags, swiping scrolls. */
const TOUCH_SENSOR_OPTIONS = {
  activationConstraint: {
    delay: 250,
    tolerance: 5,
  },
};

/* dnd-kit's defaults announce Space-bar instructions and read raw ids, neither
   of which fits a pointer-only tree. Use the node's data.name (what the default
   renderer shows) and fall back to the id for custom data shapes. */
function nodeName<T>(tree: TreeApi<T>, id: UniqueIdentifier): string {
  const key = String(id);
  if (key === OUTER_DROP_ID) return "the end of the list";
  const data = tree.get(key)?.data as { name?: unknown } | undefined;
  return typeof data?.name === "string" || typeof data?.name === "number" ? String(data.name) : key;
}

function defaultAccessibility<T>(tree: TreeApi<T>): NonNullable<TreeProps<T>["accessibility"]> {
  const name = (id: UniqueIdentifier) => nodeName(tree, id);
  return {
    screenReaderInstructions: {
      draggable: "To pick up a node, press the mouse button and drag it. Press Escape to cancel.",
    },
    announcements: {
      onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
      onDragOver: ({ active, over }) =>
        over
          ? `${name(active.id)} moved over ${name(over.id)}.`
          : `${name(active.id)} is no longer over a row.`,
      onDragEnd: ({ active, over }) =>
        over ? `Dropped ${name(active.id)} at ${name(over.id)}.` : `Dropped ${name(active.id)}.`,
      onDragCancel: ({ active }) => `Cancelled dragging ${name(active.id)}.`,
    },
  };
}

function StandaloneDndContext({
  tree,
  treeProps,
  children,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: {
  tree: TreeApi<any>;
  treeProps: TreeProps<any>;
  children: ReactNode;
  onDragStart: (e: DragStartEvent) => void;
  onDragMove: (e: DragMoveEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  onDragCancel: (e: DragCancelEvent) => void;
}) {
  /* Mouse drags start after a short move; touch drags start on a press and
     hold. dnd-kit's KeyboardSensor is deliberately excluded: it would start a
     drag on Space or Enter, which the tree already uses to toggle, select, and
     rename nodes. */
  const defaultSensors = useSensors(
    useSensor(MouseSensor, MOUSE_SENSOR_OPTIONS),
    useSensor(TouchSensor, TOUCH_SENSOR_OPTIONS),
  );

  const sensors = treeProps.sensors ?? defaultSensors;
  const accessibility = useMemo(
    () => treeProps.accessibility ?? defaultAccessibility(tree),
    [treeProps.accessibility, tree],
  );

  return (
    <DndKitContext
      sensors={sensors}
      accessibility={accessibility}
      collisionDetection={treeCollisionDetection}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {children}
    </DndKitContext>
  );
}

export function TreeProvider<T>({ treeProps, imperativeHandle, children }: Props<T>) {
  const list = useRef<FixedSizeList | VariableSizeList | null>(null);
  const listEl = useRef<HTMLDivElement | null>(null);
  const store = useRef<Store<RootState, Actions>>(
    // @ts-expect-error Redux 5 tightened createStore's PreloadedState generic; rootReducer is typed without it (v4-style).
    createStore(rootReducer, initialState(treeProps)), // Migrate to configureStore to remove this.
  );
  const state = useSyncExternalStore<RootState>(
    store.current.subscribe,
    store.current.getState,
    () => SERVER_STATE,
  );

  /* The tree api object is stable. */
  const api = useMemo(() => {
    return new TreeApi<T>(store.current, treeProps, list, listEl);
  }, []);

  /* Make sure the tree instance stays in sync */
  const updateCount = useRef(0);
  useMemo(() => {
    updateCount.current += 1;
    api.update(treeProps);
  }, Object.values(treeProps));

  /* Rebuild visible nodes when open state changes, without clobbering
     props set imperatively via api.update(). Bumping updateCount keeps
     DataUpdates consumers (e.g. DefaultContainer) in sync. */
  useMemo(() => {
    updateCount.current += 1;
    api.update(api.props);
  }, [state.nodes.open]);

  /* Drop any hover still waiting for an animation frame. */
  useEffect(() => () => api.cancelHover(), [api]);

  /* Expose the tree api */
  useImperativeHandle(imperativeHandle, () => api);

  /* Change selection based on props */
  useEffect(() => {
    if (api.props.selection) {
      api.select(api.props.selection, { focus: false });
    } else {
      api.deselectAll();
    }
  }, [api.props.selection]);

  /* Clear visability for filtered nodes */
  useEffect(() => {
    if (!api.props.searchTerm) {
      store.current.dispatch(visibility.clear(true));
    }
  }, [api.props.searchTerm]);

  const { onDragStart, onDragMove, onDragEnd, onDragCancel } = useDragHandlers(api, store.current);

  return (
    <TreeApiContext.Provider value={api}>
      <DataUpdatesContext.Provider value={updateCount.current}>
        <NodesContext.Provider value={state.nodes}>
          <DndContext.Provider value={state.dnd}>
            <StandaloneDndContext
              tree={api}
              treeProps={treeProps}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
              onDragCancel={onDragCancel}
            >
              {children}
            </StandaloneDndContext>
          </DndContext.Provider>
        </NodesContext.Provider>
      </DataUpdatesContext.Provider>
    </TreeApiContext.Provider>
  );
}
