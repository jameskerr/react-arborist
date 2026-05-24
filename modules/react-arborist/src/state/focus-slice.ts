/* Types */

export type FocusState = { id: string | null; treeFocused: boolean };

/* Actions */

export function focus(id: string | null) {
  return { type: "FOCUS" as const, id };
}

export function treeBlur() {
  return { type: "TREE_BLUR" } as const;
}

/* Reducer */

export function reducer(
  state: FocusState = { id: null, treeFocused: false },
  action: ReturnType<typeof focus> | ReturnType<typeof treeBlur>,
) {
  if (action.type === "FOCUS") {
    return { ...state, id: action.id, treeFocused: true };
  } else if (action.type === "TREE_BLUR") {
    return { ...state, treeFocused: false };
  } else {
    return state;
  }
}
