import { NodeApi } from "../interfaces/node-api.js";
import { canDragNode } from "./drag-hook.js";

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
