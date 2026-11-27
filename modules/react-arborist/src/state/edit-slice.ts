/* Types */
export type EditState = { id: string | null };

export const initialEditState = (): EditState => ({ id: null });

/* Actions */
export function edit(id: string | null) {
  return { type: "EDIT" as const, id };
}

/* Reducer */
export function reducer(state: EditState = initialEditState(), action: ReturnType<typeof edit>) {
  if (action.type === "EDIT") {
    return { ...state, id: action.id };
  } else {
    return state;
  }
}
