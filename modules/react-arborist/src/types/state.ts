import { NodeApi } from "../interfaces/node-api";

export type NodeState = (typeof NodeApi.prototype)["state"];
