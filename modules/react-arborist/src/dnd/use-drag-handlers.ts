import { useCallback, useEffect, useRef } from "react";
import type { DragCancelEvent, DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import type { Store } from "redux";
import type { TreeApi } from "../interfaces/tree-api.js";
import type { NodeApi } from "../interfaces/node-api.js";
import type { Actions, RootState } from "../state/root-reducer.js";
import { actions as dndActions } from "../state/dnd-slice.js";
import { computeDrop } from "./compute-drop.js";
import type { Measurable } from "./compute-drop.js";
import { OUTER_DROP_ID } from "./outer-drop-hook.js";

type Mouse = { x: number; y: number };

type HoverTarget = {
  element: Measurable;
  node: NodeApi | null;
  prevNode: NodeApi | null;
  nextNode: NodeApi | null;
};

/* What the pointer is over, resolved to the element to measure against and the
   row whose edges decide the drop. Null when the target can't be measured. */
function hoverTarget<T>(api: TreeApi<T>, over: DragMoveEvent["over"]): HoverTarget | null {
  if (!over) return null;

  const overId = String(over.id);

  if (overId === OUTER_DROP_ID) {
    const element = api.listEl.current;
    if (!element) return null;
    return {
      element,
      node: null,
      prevNode: api.visibleNodes[api.visibleNodes.length - 1] ?? null,
      nextNode: null,
    };
  }

  const node = api.get(overId);
  /* useDropHook always puts the row's element ref on the droppable's data, so a
     row that reports itself as `over` has a live element. */
  const element = over.data.current?.elementRef?.current ?? null;
  if (!node || !element) return null;
  return { element, node, prevNode: node.prev, nextNode: node.next };
}

/* All of the dnd-kit wiring for one tree: sensor callbacks in, tree api state
   out. Kept out of TreeProvider so the provider stays a wiring component. */
export function useDragHandlers<T>(
  api: TreeApi<T>,
  store: Store<RootState, Actions>,
  dragId: string | null,
) {
  /* dnd-kit's delta includes scroll adjustments, so `activator + delta` is not
     the pointer position once the list auto-scrolls mid-drag. Track the real
     pointer natively instead. */
  const pointerRef = useRef<Mouse | null>(null);

  useEffect(() => {
    if (!dragId) return;
    const track = (event: Event) => {
      const coords = getEventCoordinates(event);
      if (coords) pointerRef.current = coords;
    };
    document.addEventListener("pointermove", track, true);
    document.addEventListener("mousemove", track, true);
    document.addEventListener("touchmove", track, true);
    return () => {
      document.removeEventListener("pointermove", track, true);
      document.removeEventListener("mousemove", track, true);
      document.removeEventListener("touchmove", track, true);
    };
  }, [dragId]);

  const updateHover = useCallback(
    (over: DragMoveEvent["over"], mouse: Mouse | null) => {
      if (!mouse) return;

      if (!over) {
        api.cancelHover();
        api.hideCursor();
        return;
      }

      const target = hoverTarget(api, over);
      if (!target) return;

      const { cursor, drop } = computeDrop({ ...target, offset: mouse, indent: api.indent });
      api.hover(drop, cursor);
    },
    [api],
  );

  /* Falls back to activator + delta only until a real pointer event arrives. */
  const mouseFrom = useCallback((event: DragMoveEvent | DragEndEvent) => {
    if (pointerRef.current) return pointerRef.current;
    if (!event.activatorEvent) return null;
    const start = getEventCoordinates(event.activatorEvent);
    if (!start) return null;
    return { x: start.x + event.delta.x, y: start.y + event.delta.y };
  }, []);

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      const dragIds = api.isSelected(id) ? Array.from(api.selectedIds) : [id];
      store.dispatch(dndActions.dragStart(id, dragIds));
      pointerRef.current = event.activatorEvent ? getEventCoordinates(event.activatorEvent) : null;
    },
    [api, store],
  );

  const onDragMove = useCallback(
    (event: DragMoveEvent) => {
      updateHover(event.over, mouseFrom(event));
    },
    [mouseFrom, updateHover],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (event.over) {
        updateHover(event.over, mouseFrom(event));
        if (api.canDrop()) {
          api.drop();
        }
      }
      api.cancelHover();
      api.hideCursor();
      api.redrawList();
      store.dispatch(dndActions.dragEnd());
    },
    [api, mouseFrom, store, updateHover],
  );

  const onDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      api.cancelHover();
      api.hideCursor();
      api.redrawList();
      store.dispatch(dndActions.dragEnd());
    },
    [api, store],
  );

  return { onDragStart, onDragMove, onDragEnd, onDragCancel };
}
