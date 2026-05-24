import { ActionTypes } from "../types/utils";
import { actions as dnd } from "./dnd-slice";
import { initialState } from "./initial";

/* Types */

export type DragSlice = {
  id: string | null;
  selectedIds: string[];
  destinationParentId: string | null;
  destinationIndex: number | null;
};

/* Reducer */

export function reducer(
  state: DragSlice = initialState().nodes.drag,
  action: ActionTypes<typeof dnd>,
): DragSlice {
  switch (action.type) {
    case "DND_DRAG_START":
      return { ...state, id: action.id, selectedIds: action.dragIds };
    case "DND_DRAG_END":
      return {
        ...state,
        id: null,
        destinationParentId: null,
        destinationIndex: null,
        selectedIds: [],
      };
    case "DND_HOVERING":
      if (action.parentId !== state.destinationParentId || action.index != state.destinationIndex) {
        return {
          ...state,
          destinationParentId: action.parentId,
          destinationIndex: action.index,
        };
      } else {
        return state;
      }
    default:
      return state;
  }
}
