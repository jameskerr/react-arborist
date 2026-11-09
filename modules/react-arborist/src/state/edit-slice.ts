/* Types */
export type EditState = { id: string | null };

/* Actions */
export function edit(id: string | null) {
  return { type: "EDIT" as const, id };
}

/* Reducer */
export function reducer(state: EditState = { id: null }, action: ReturnType<typeof edit>) {
  if (action.type === "EDIT") {
    return { ...state, id: action.id };
  } else {
    return state;
  }
}
