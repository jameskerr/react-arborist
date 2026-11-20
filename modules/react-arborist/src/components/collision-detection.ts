import { CollisionDetection, pointerWithin } from "@dnd-kit/core";
import type { ClientRect } from "@dnd-kit/core";
import { OUTER_DROP_ID } from "../dnd/outer-drop-hook.js";
import type { XYCoord } from "../types/renderers.js";

function isInside(rect: ClientRect, point: XYCoord) {
  return (
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
  );
}

/** Collision detection for react-arborist: prefers row droppables over the outer list droppable. */
export const treeCollisionDetection: CollisionDetection = (args) => {
  const collisions = pointerWithin(args);
  if (collisions.length === 0) return [];
  const rowCollision = collisions.find((c) => c.id !== OUTER_DROP_ID);
  if (!rowCollision) return collisions;

  /* dnd-kit's droppable rects are not clipped to the scroll container, so an
     overscan row or a partly visible row can stick out past the list. A
     pointer over a toolbar beside the tree could then pick a row the user
     can't see. react-dnd hit-tested the DOM, where overflow clipping applied;
     require the pointer to be inside the list as well. */
  const listRect = args.droppableRects.get(OUTER_DROP_ID);
  if (listRect && (!args.pointerCoordinates || !isInside(listRect, args.pointerCoordinates))) {
    return collisions.filter((c) => c.id === OUTER_DROP_ID);
  }

  return [rowCollision];
};
