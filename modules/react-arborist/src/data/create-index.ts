import type { NodeApi } from "../interfaces/node-api.js";

export const createIndex = <T>(nodes: NodeApi<T>[]) => {
  return nodes.reduce<{ [id: string]: number }>((map, node, index) => {
    map[node.id] = index;
    return map;
  }, {});
};
