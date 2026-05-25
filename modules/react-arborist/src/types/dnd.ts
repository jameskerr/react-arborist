export type CursorLocation = {
  index: number | null;
  level: number | null;
  parentId: string | null;
};

export type DragItem<T = any> = {
  /* The id of the row the drag started on. */
  id: string;
  /* Every node carried by the drag (the selection, or just `id`). */
  dragIds: string[];
  /* The dragged node's data, so external drop targets can read it. */
  data: T;
};
