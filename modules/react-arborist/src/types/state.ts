import { NodeApi } from "../interfaces/node-api.js";

export type NodeState = (typeof NodeApi.prototype)["state"];
