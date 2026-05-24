import { ActionTypes } from "../types/utils";

/* Types */
export type OpenMap = { [id: string]: boolean };
export type OpenSlice = { unfiltered: OpenMap; filtered: OpenMap };

/* Actions */
export const actions = {
  open(id: string, filtered: boolean) {
    return { type: "VISIBILITY_OPEN" as const, id, filtered };
  },
  close(id: string, filtered: boolean) {
    return { type: "VISIBILITY_CLOSE" as const, id, filtered };
  },
  toggle(id: string, filtered: boolean) {
    return { type: "VISIBILITY_TOGGLE" as const, id, filtered };
  },
  clear(filtered: boolean) {
    return { type: "VISIBILITY_CLEAR" as const, filtered };
  },
};

/* Reducer */

function openMapReducer(state: OpenMap = {}, action: ActionTypes<typeof actions>) {
  if (action.type === "VISIBILITY_OPEN") {
    return { ...state, [action.id]: true };
  } else if (action.type === "VISIBILITY_CLOSE") {
    return { ...state, [action.id]: false };
  } else if (action.type === "VISIBILITY_TOGGLE") {
    const prev = state[action.id];
    return { ...state, [action.id]: !prev };
  } else if (action.type === "VISIBILITY_CLEAR") {
    return {};
  } else {
    return state;
  }
}

export function reducer(
  state: OpenSlice = { filtered: {}, unfiltered: {} },
  action: ActionTypes<typeof actions>,
): OpenSlice {
  if (!action.type.startsWith("VISIBILITY")) return state;
  if (action.filtered) {
    return { ...state, filtered: openMapReducer(state.filtered, action) };
  } else {
    return { ...state, unfiltered: openMapReducer(state.unfiltered, action) };
  }
}
