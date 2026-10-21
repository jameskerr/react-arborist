import {
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
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
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  useDndContext as useDndKitContext,
  useDndMonitor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import {
  DataUpdatesContext,
  DndContext,
  DragPreviewContext,
  DragPreviewState,
  NodesContext,
  TreeApiContext,
} from "../context.js";
import { TreeApi } from "../interfaces/tree-api.js";
import { initialState } from "../state/initial.js";
import { Actions, rootReducer, RootState } from "../state/root-reducer.js";
import { actions as visibility } from "../state/open-slice.js";
import { actions as dndActions } from "../state/dnd-slice.js";
import { TreeProps } from "../types/tree-props.js";
import { treeCollisionDetection } from "./get-dnd-provider-props.js";
import { OUTER_DROP_ID } from "../dnd/outer-drop-hook.js";
import { computeDrop } from "../dnd/compute-drop.js";

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
const KEYBOARD_SENSOR_OPTIONS = {};

const INITIAL_DRAG_PREVIEW_STATE: DragPreviewState = {
  offset: null,
  mouse: null,
  id: null,
  dragIds: [],
  isDragging: false,
};

function useHasParentDndContext(): boolean {
  const ctx = useDndKitContext();
  // Outside of a <DndContext>, @dnd-kit's default context uses 0-arg noop stubs (length === 0).
  // Inside an active <DndContext>, dragOverlay.setRef expects (element) and
  // measureDroppableContainers expects (ids), so their arity is >= 1.
  return ctx.dragOverlay.setRef.length > 0 || ctx.measureDroppableContainers.length > 0;
}

function ExternalDndListener({
  children,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: {
  children: ReactNode;
  onDragStart: (e: DragStartEvent) => void;
  onDragMove: (e: DragMoveEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  onDragCancel: (e: DragCancelEvent) => void;
}) {
  useDndMonitor({
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
  });
  return <>{children}</>;
}

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
  const defaultSensors = useSensors(
    useSensor(
      typeof window !== "undefined" && "PointerEvent" in window ? PointerSensor : MouseSensor,
      POINTER_SENSOR_OPTIONS,
    ),
    useSensor(KeyboardSensor, KEYBOARD_SENSOR_OPTIONS),
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

  const [dragPreviewState, setDragPreviewState] = useState<DragPreviewState>(
    INITIAL_DRAG_PREVIEW_STATE,
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

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      const dragIds = api.isSelected(id) ? Array.from(api.selectedIds) : [id];
      store.current.dispatch(dndActions.dragStart(id, dragIds));

      const initialCoords = event.activatorEvent ? getEventCoordinates(event.activatorEvent) : null;
      const initialRect = event.active.rect.current.initial;
      const offset = initialRect ? { x: initialRect.left, y: initialRect.top } : initialCoords;

      setDragPreviewState({
        offset,
        mouse: initialCoords,
        id,
        dragIds,
        isDragging: true,
      });
    },
    [api],
  );

  const updateHover = useCallback(
    (
      over: DragMoveEvent["over"],
      activatorEvent: Event | null,
      delta: { x: number; y: number },
    ) => {
      const initialCoords = activatorEvent ? getEventCoordinates(activatorEvent) : null;
      const mouse = initialCoords
        ? { x: initialCoords.x + delta.x, y: initialCoords.y + delta.y }
        : null;

      if (!mouse) return;

      if (over) {
        const overId = String(over.id);
        if (overId === OUTER_DROP_ID) {
          if (api.listEl.current) {
            const { cursor, drop } = computeDrop({
              element: api.listEl.current,
              offset: mouse,
              indent: api.indent,
              node: null,
              prevNode: api.visibleNodes[api.visibleNodes.length - 1] ?? null,
              nextNode: null,
            });
            api.hover(drop, cursor);
          }
        } else {
          const node = api.get(overId);
          if (node) {
            const element =
              (over.data.current?.elementRef?.current as HTMLElement | null) ??
              ({ getBoundingClientRect: () => over.rect } as unknown as HTMLElement);
            const { cursor, drop } = computeDrop({
              element,
              offset: mouse,
              indent: api.indent,
              node,
              prevNode: node.prev,
              nextNode: node.next,
            });
            api.hover(drop, cursor);
          }
        }
      } else {
        api.cancelHover();
        api.hideCursor();
      }
    },
    [api],
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const initialCoords = event.activatorEvent ? getEventCoordinates(event.activatorEvent) : null;
      const delta = event.delta;
      const mouse = initialCoords
        ? { x: initialCoords.x + delta.x, y: initialCoords.y + delta.y }
        : null;
      const initialRect = event.active.rect.current.initial;
      const offset = initialRect
        ? { x: initialRect.left + delta.x, y: initialRect.top + delta.y }
        : mouse;

      setDragPreviewState((prev) => ({
        ...prev,
        offset,
        mouse,
      }));

      updateHover(event.over, event.activatorEvent, event.delta);
    },
    [updateHover],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (event.over) {
        updateHover(event.over, event.activatorEvent, event.delta);
        if (api.canDrop()) {
          api.drop();
        }
      }
      api.cancelHover();
      api.hideCursor();
      api.redrawList();
      store.current.dispatch(dndActions.dragEnd());
      setDragPreviewState(INITIAL_DRAG_PREVIEW_STATE);
    },
    [api, updateHover],
  );

  const handleDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      api.cancelHover();
      api.hideCursor();
      api.redrawList();
      store.current.dispatch(dndActions.dragEnd());
      setDragPreviewState(INITIAL_DRAG_PREVIEW_STATE);
    },
    [api],
  );

  const hasParentDnd = useHasParentDndContext();

  const dndContent = hasParentDnd ? (
    <ExternalDndListener
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
    </ExternalDndListener>
  ) : (
    <StandaloneDndContext
      treeProps={treeProps}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
    </StandaloneDndContext>
  );

  return (
    <TreeApiContext.Provider value={api}>
      <DataUpdatesContext.Provider value={updateCount.current}>
        <NodesContext.Provider value={state.nodes}>
          <DndContext.Provider value={state.dnd}>
            <DragPreviewContext.Provider value={dragPreviewState}>
              {dndContent}
            </DragPreviewContext.Provider>
          </DndContext.Provider>
        </NodesContext.Provider>
      </DataUpdatesContext.Provider>
    </TreeApiContext.Provider>
  );
}
