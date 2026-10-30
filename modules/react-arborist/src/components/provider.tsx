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
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { DataUpdatesContext, DndContext, NodesContext, TreeApiContext } from "../context.js";

import { TreeApi } from "../interfaces/tree-api.js";
import { initialState } from "../state/initial.js";
import { Actions, rootReducer, RootState } from "../state/root-reducer.js";
import { actions as visibility } from "../state/open-slice.js";
import { TreeProps } from "../types/tree-props.js";
import { treeCollisionDetection } from "./get-dnd-provider-props.js";
import { useDragHandlers } from "../dnd/use-drag-handlers.js";

type Props<T> = {
  treeProps: TreeProps<T>;
  imperativeHandle: React.Ref<TreeApi<T> | undefined>;
  children: ReactNode;
};

const SERVER_STATE = initialState();

const POINTER_SENSOR_OPTIONS = {
  activationConstraint: {
    distance: 5,
  },
};

function StandaloneDndContext({
  treeProps,
  children,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: {
  treeProps: TreeProps<any>;
  children: ReactNode;
  onDragStart: (e: DragStartEvent) => void;
  onDragMove: (e: DragMoveEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  onDragCancel: (e: DragCancelEvent) => void;
}) {
  /* Pointer drags only: dnd-kit's KeyboardSensor would start a drag on Space or
     Enter, which the tree already uses to toggle, select, and rename nodes. */
  const defaultSensors = useSensors(
    useSensor(
      typeof window !== "undefined" && "PointerEvent" in window ? PointerSensor : MouseSensor,
      POINTER_SENSOR_OPTIONS,
    ),
  );

  const sensors = treeProps.sensors ?? defaultSensors;

  return (
    <DndKitContext
      sensors={sensors}
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

  const { onDragStart, onDragMove, onDragEnd, onDragCancel } = useDragHandlers(
    api,
    store.current,
    state.nodes.drag.id,
  );

  return (
    <TreeApiContext.Provider value={api}>
      <DataUpdatesContext.Provider value={updateCount.current}>
        <NodesContext.Provider value={state.nodes}>
          <DndContext.Provider value={state.dnd}>
            <StandaloneDndContext
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
