import { Cursor } from "../dnd/compute-drop.js";
import { ActionTypes } from "../types/utils.js";

/* Types */
export type DndState = {
  dragId: null | string;
  cursor: Cursor;
  dragIds: string[];
  parentId: null | string;
  index: number | null;
  destinationParentId: string | null;
  destinationIndex: number | null;
};

/* Actions */
export const actions = {
  cursor(cursor: Cursor) {
    return { type: "DND_CURSOR" as const, cursor };
  },
  dragStart(id: string, dragIds: string[]) {
    return { type: "DND_DRAG_START" as const, id, dragIds };
  },
  dragEnd() {
    return { type: "DND_DRAG_END" as const };
  },
  hovering(parentId: string | null, index: number | null) {
    return { type: "DND_HOVERING" as const, parentId, index };
  },
  /* The consumer-facing destination (willReceiveDrop / dragDestinationParent).
     Dispatched by tree.hover() only when the target is actually droppable, so
     it never points somewhere canDrop()/the cursor forbids (#247). It lives in
     this slice rather than in nodes.drag because every visible row consumes the
     whole nodes state through NodesContext: a destination change there
     re-rendered all of them, while only the two rows whose highlight moved care
     (see useDestinationUpdates). */
  setDestination(parentId: string | null, index: number | null) {
    return { type: "DND_DESTINATION" as const, parentId, index };
  },
};

/* `dragover` fires many times per frame, but the resulting cursor is usually identical.
   Comparing the cursors lets the reducer keep the previous state object so that React
   can skip the (expensive) re-render of the tree. */
function isSameCursor(a: Cursor, b: Cursor): boolean {
  if (a === b) return true;
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "line":
      return b.type === "line" && a.index === b.index && a.level === b.level;
    case "highlight":
      return b.type === "highlight" && a.id === b.id;
    case "none":
      return true;
    default: {
      const _exhaustive: never = a;
      return false;
    }
  }
}

export const initialDndState: DndState = {
  cursor: { type: "none" },
  dragId: null,
  dragIds: [],
  parentId: null,
  index: -1,
  destinationParentId: null,
  destinationIndex: null,
};

/* Reducer */
export function reducer(
  state: DndState = initialDndState,
  action: ActionTypes<typeof actions>,
): DndState {
  switch (action.type) {
    case "DND_CURSOR":
      return isSameCursor(state.cursor, action.cursor)
        ? state
        : { ...state, cursor: action.cursor };
    case "DND_DRAG_START":
      return { ...state, dragId: action.id, dragIds: action.dragIds };
    case "DND_DRAG_END":
      return initialDndState;
    case "DND_HOVERING":
      return state.parentId === action.parentId && state.index === action.index
        ? state
        : { ...state, parentId: action.parentId, index: action.index };
    case "DND_DESTINATION":
      return state.destinationParentId === action.parentId &&
        state.destinationIndex === action.index
        ? state
        : { ...state, destinationParentId: action.parentId, destinationIndex: action.index };
    default:
      return state;
  }
}
