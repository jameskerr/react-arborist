import { useCallback, useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useTreeApi } from "../context.js";
import { NodeApi } from "../interfaces/node-api.js";
import { TreeProps } from "../types/tree-props.js";

/* The item type a row's drag source broadcasts. The dragType prop
   can be a fixed string or a per-node function; it defaults to "NODE". */
export function dragTypeForNode<T>(dragType: TreeProps<T>["dragType"], node: NodeApi<T>): string {
  if (typeof dragType === "function") return dragType(node);
  return dragType ?? "NODE";
}

/* A node can start a drag only when it's draggable and not currently being
   renamed. Without the editing guard, dragging inside the rename input would
   pick the row up and move it (issue #195). */
export function canDragNode<T>(node: NodeApi<T>): boolean {
  return node.isDraggable && !node.isEditing;
}

export type DragHandleRef = (element: HTMLElement | null) => void;

export function useDragHook<T>(node: NodeApi<T>): DragHandleRef {
  const tree = useTreeApi<T>();
  const isEnabled = canDragNode(node);
  const dragType = dragTypeForNode(tree.props.dragType, node);

  const { listeners, setNodeRef, setActivatorNodeRef } = useDraggable({
    id: node.id,
    disabled: !isEnabled,
    data: {
      id: node.id,
      node,
      data: node.data,
      type: dragType,
    },
  });

  const listenersRef = useRef(listeners);
  listenersRef.current = listeners;

  const [element, setElement] = useState<HTMLElement | null>(null);

  const dragHandle: DragHandleRef = useCallback(
    (el: HTMLElement | null) => {
      setElement(el);
      setNodeRef(el);
      setActivatorNodeRef(el);
    },
    [setNodeRef, setActivatorNodeRef],
  );

  useEffect(() => {
    if (!element || !listeners) return;

    const cleanupFns: (() => void)[] = [];

    for (const [propName, handler] of Object.entries(listeners)) {
      if (!propName.startsWith("on") || typeof handler !== "function") continue;
      const eventName = propName.slice(2).toLowerCase();
      const listener = (event: Event) => {
        const currentHandler = listenersRef.current?.[propName];
        if (currentHandler) {
          /* dnd-kit's activators expect a React-style synthetic event, but the
             dragHandle contract is a ref callback, so listeners can't be spread
             onto JSX. Hand them the native event plus the members activators
             touch (target, preventDefault, stopPropagation). */
          currentHandler({
            nativeEvent: event,
            target: event.target,
            preventDefault: () => event.preventDefault(),
            stopPropagation: () => event.stopPropagation(),
          });
        }
      };
      element.addEventListener(eventName, listener);
      cleanupFns.push(() => {
        element.removeEventListener(eventName, listener);
      });
    }

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [element, listeners]);

  return dragHandle;
}
