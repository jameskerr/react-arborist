import { NodeApi } from "../interfaces/node-api";
import { dragTypeForNode } from "./drag-hook";

/* dragTypeForNode only reads node.data when dragType is a function, so a
   minimal stub stands in for a real NodeApi. */
function nodeWith<T>(data: T): NodeApi<T> {
  return { data } as NodeApi<T>;
}

test("defaults to the internal NODE type when dragType is undefined", () => {
  expect(dragTypeForNode(undefined, nodeWith({ id: "a" }))).toBe("NODE");
});

test("uses a fixed string dragType for every node", () => {
  expect(dragTypeForNode("FILE", nodeWith({ id: "a" }))).toBe("FILE");
});

test("resolves a per-node dragType function against the node", () => {
  const dragType = (node: NodeApi<{ kind: string }>) => node.data.kind.toUpperCase();
  expect(dragTypeForNode(dragType, nodeWith({ kind: "folder" }))).toBe("FOLDER");
  expect(dragTypeForNode(dragType, nodeWith({ kind: "file" }))).toBe("FILE");
});
