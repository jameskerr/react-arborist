import { ActionTypes } from "../types/utils";
import { initialState } from "./initial";

/* Types */
export type SelectionState = {
  ids: Set<string>;
  anchor: string | null;
  mostRecent: string | null;
};

/* Actions. These take ids already resolved to strings: callers go through
   TreeApi.identify(), which honors a custom idAccessor. Keeping the slice
   string-only means there is a single, accessor-aware identify() rather than a
   second `.id`-assuming one hiding here. */
export const actions = {
  clear: () => ({ type: "SELECTION_CLEAR" as const }),

  only: (id: string) => ({
    type: "SELECTION_ONLY" as const,
    id,
  }),

  add: (id: string | string[]) => ({
    type: "SELECTION_ADD" as const,
    ids: Array.isArray(id) ? id : [id],
  }),

  remove: (id: string | string[]) => ({
    type: "SELECTION_REMOVE" as const,
    ids: Array.isArray(id) ? id : [id],
  }),

  set: (args: { ids: Set<string>; anchor: string | null; mostRecent: string | null }) => ({
    type: "SELECTION_SET" as const,
    ...args,
  }),

  mostRecent: (id: string | null) => ({
    type: "SELECTION_MOST_RECENT" as const,
    id,
  }),

  anchor: (id: string | null) => ({
    type: "SELECTION_ANCHOR" as const,
    id,
  }),
};

/* Reducer */
export function reducer(
  state: SelectionState = initialState()["nodes"]["selection"],
  action: ActionTypes<typeof actions>,
): SelectionState {
  const ids = state.ids;
  switch (action.type) {
    case "SELECTION_CLEAR":
      return { ...state, ids: new Set() };
    case "SELECTION_ONLY":
      return { ...state, ids: new Set([action.id]) };
    case "SELECTION_ADD":
      if (action.ids.length === 0) return state;
      action.ids.forEach((id) => ids.add(id));
      return { ...state, ids: new Set(ids) };
    case "SELECTION_REMOVE":
      if (action.ids.length === 0) return state;
      action.ids.forEach((id) => ids.delete(id));
      return { ...state, ids: new Set(ids) };
    case "SELECTION_SET":
      return {
        ...state,
        ids: action.ids,
        mostRecent: action.mostRecent,
        anchor: action.anchor,
      };
    case "SELECTION_MOST_RECENT":
      return { ...state, mostRecent: action.id };
    case "SELECTION_ANCHOR":
      return { ...state, anchor: action.id };
    default:
      return state;
  }
}
