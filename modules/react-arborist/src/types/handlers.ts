import { NodeApi } from "../interfaces/node-api";
import { IdObj } from "./utils";

export type CreateHandler<T> = (args: {
  parentId: string | null;
  parentNode: NodeApi<T> | null;
  index: number;
  type: "internal" | "leaf";
  treeId?: string;
}) => (IdObj | null) | Promise<IdObj | null>;

export type MoveHandler<T> = (args: {
  dragIds: string[];
  dragNodes?: T[];
  parentId: string | null;
  index: number;
  treeId?: string;
}) => void | Promise<void>;

export type RenameHandler<T> = (args: {
  id: string;
  name: string;
  node: NodeApi<T>;
  treeId?: string;
}) => void | Promise<void>;

export type DeleteHandler<T> = (args: {
  ids: string[];
  treeId?: string;
}) => void | Promise<void>;

export type CrossTreeDeleteHandler<T> = (args: {
  ids: string[];
  treeId?: string;
}) => void | Promise<void>;

export type CrossTreeAddHandler<T> = (args: {
  ids: string[],
  parentId: string | null,
  index: number,
  dragNodes: T[],
  treeId?: string;
}) => void | Promise<void>;

export type EditResult =
  | { cancelled: true }
  | { cancelled: false; value: string };
