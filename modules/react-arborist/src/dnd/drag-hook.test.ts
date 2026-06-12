import { NodeApi } from "../interfaces/node-api";
import { canDragNode, dragTypeForNode } from "./drag-hook";

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

/* canDragNode only reads the isDraggable/isEditing flags, so a minimal stub
   stands in for a real NodeApi. */
function draggableNode(flags: { isDraggable: boolean; isEditing: boolean }): NodeApi {
  return flags as NodeApi;
}

test("a draggable node that isn't being edited can drag", () => {
  expect(canDragNode(draggableNode({ isDraggable: true, isEditing: false }))).toBe(true);
});

test("a non-draggable node can't drag", () => {
  expect(canDragNode(draggableNode({ isDraggable: false, isEditing: false }))).toBe(false);
});

test("a node being renamed can't drag, even when draggable (#195)", () => {
  expect(canDragNode(draggableNode({ isDraggable: true, isEditing: true }))).toBe(false);
});
