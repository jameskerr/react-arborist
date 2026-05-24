import { NodeApi } from "../interfaces/node-api";
import { IdObj } from "./utils";

export type CreateHandler<T> = (args: {
  parentId: string | null;
  parentNode: NodeApi<T> | null;
  index: number;
  type: "internal" | "leaf";
}) => (IdObj | null) | Promise<IdObj | null>;

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
