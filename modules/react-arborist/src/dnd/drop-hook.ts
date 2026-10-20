import { RefObject } from "react";
import { useDroppable } from "@dnd-kit/core";
import { NodeApi } from "../interfaces/node-api.js";

export type DropResult = {
  parentId: string | null;
  index: number | null;
};

export type DropTargetRef = (element: HTMLElement | null) => void;

export function useDropHook(el: RefObject<HTMLElement | null>, node: NodeApi<any>): DropTargetRef {
  const { setNodeRef } = useDroppable({
    id: node.id,
    data: {
      id: node.id,
      node,
      elementRef: el,
    },
  });

  return setNodeRef;
}
