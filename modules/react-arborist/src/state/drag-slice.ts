import { ActionTypes } from "../types/utils.js";
import { actions as dnd } from "./dnd-slice.js";

/* Types */

export type DragSlice = {
  id: string | null;
  selectedIds: string[];
};

export const initialDragState: DragSlice = {
  id: null,
  selectedIds: [],
};

/* Reducer */

export function reducer(
  state: DragSlice = initialDragState,
  action: ActionTypes<typeof dnd>,
): DragSlice {
  switch (action.type) {
    case "DND_DRAG_START":
      return { ...state, id: action.id, selectedIds: action.dragIds };
    case "DND_DRAG_END":
      return { ...state, id: null, selectedIds: [] };
    default:
      return state;
  }
}
