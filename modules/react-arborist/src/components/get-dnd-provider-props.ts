import { CollisionDetection, pointerWithin } from "@dnd-kit/core";
import { OUTER_DROP_ID } from "../dnd/outer-drop-hook.js";

/** Collision detection for react-arborist: prefers row droppables over the outer list droppable. */
export const treeCollisionDetection: CollisionDetection = (args) => {
  const collisions = pointerWithin(args);
  if (collisions.length === 0) return [];
  const rowCollision = collisions.find((c) => c.id !== OUTER_DROP_ID);
  if (rowCollision) {
    return [rowCollision];
  }
  return collisions;
};
