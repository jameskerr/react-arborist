import { AnyAction } from "redux";
import { NodeApi } from "../interfaces/node-api";

export interface IdObj {
  id: string;
}

export type Identity = string | IdObj | null;

export type BoolFunc<T> = (data: T) => boolean;

export type ActionTypes<Actions extends { [name: string]: (...args: any[]) => AnyAction }> =
  ReturnType<Actions[keyof Actions]>;

export type SelectOptions = { multi?: boolean; contiguous?: boolean };

export type NodesById<T> = { [id: string]: NodeApi<T> };
