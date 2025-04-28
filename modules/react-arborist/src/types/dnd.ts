import { TreeApi } from "../interfaces/tree-api";

export type CursorLocation = {
  index: number | null;
  level: number | null;
  parentId: string | null;
};

export type DragItem = {
  id: string;
  dragIds: string[];
  sourceTree: TreeApi<unknown>;
};
