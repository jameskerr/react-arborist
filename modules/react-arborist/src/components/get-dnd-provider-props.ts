import {
  CollisionDetection,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  pointerWithin,
  SensorDescriptor,
  SensorOptions,
} from "@dnd-kit/core";
import { TreeProps } from "../types/tree-props.js";
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

export function getDefaultSensors(): SensorDescriptor<SensorOptions>[] {
  const ActivePointerSensor =
    typeof window !== "undefined" && "PointerEvent" in window ? PointerSensor : MouseSensor;

  return [
    {
      sensor: ActivePointerSensor,
      options: {
        activationConstraint: {
          distance: 5,
        },
      },
    },
    {
      sensor: KeyboardSensor,
      options: {},
    },
  ];
}

export type DndContextProps = {
  sensors?: SensorDescriptor<SensorOptions>[];
  collisionDetection: CollisionDetection;
};

/** Resolves the props for @dnd-kit's <DndContext>. */
export function getDndProviderProps<T>(treeProps: TreeProps<T>): DndContextProps {
  return {
    sensors: treeProps.sensors,
    collisionDetection: treeCollisionDetection,
  };
}
