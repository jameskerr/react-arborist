import { NodeApi } from "../interfaces/node-api";
import { IdObj } from "./utils";

// Returns the newly created row data, whose id is read via idAccessor. `IdObj`
// is kept for back-compat with handlers that return a bare `{ id }` (#347).
export type CreateHandler<T> = (args: {
  parentId: string | null;
  parentNode: NodeApi<T> | null;
  index: number;
  type: "internal" | "leaf";
}) => (T | IdObj | null) | Promise<T | IdObj | null>;

export type MoveHandler<T> = (args: {
  dragIds: string[];
  dragNodes: NodeApi<T>[];
  parentId: string | null;
  parentNode: NodeApi<T> | null;
  index: number;
}) => void | Promise<void>;

export type RenameHandler<T> = (args: {
  id: string;
  name: string;
  node: NodeApi<T>;
}) => void | Promise<void>;

export type DeleteHandler<T> = (args: {
  ids: string[];
  nodes: NodeApi<T>[];
}) => void | Promise<void>;

export type EditResult = { cancelled: true } | { cancelled: false; value: string };
