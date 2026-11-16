import { useCallback, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { DraggableAttributes } from "@dnd-kit/core";
import { NodeApi } from "../interfaces/node-api.js";

/* A node can start a drag only when it's draggable and not currently being
   renamed. Without the editing guard, dragging inside the rename input would
   pick the row up and move it (issue #195). */
export function canDragNode<T>(node: NodeApi<T>): boolean {
  return node.isDraggable && !node.isEditing;
}

export type DragHandleRef = (element: HTMLElement | null) => void;

export type DragHook = {
  dragHandle: DragHandleRef;
  /* dnd-kit's aria attributes. They belong on the row (the element that takes
     focus), not on the handle; see row-container.tsx. */
  attributes: DraggableAttributes;
};

/* dnd-kit returns no listeners while a draggable is disabled, so the activator
   events are attached from a fixed list and dispatched through listenersRef at
   event time. Reading the object once at mount would leave a row that mounted
   disabled with no listeners after it is enabled. A custom sensor can register
   an activator outside this list (onContextMenu for a long-press sensor), so
   the live listener keys are bound too. */
const ACTIVATOR_PROPS = ["onPointerDown", "onMouseDown", "onTouchStart", "onKeyDown"] as const;

function boundEvents(listeners: Record<string, unknown> | undefined): string[] {
  return [...new Set([...ACTIVATOR_PROPS, ...Object.keys(listeners ?? {})])];
}

export function useDragHook<T>(node: NodeApi<T>): DragHook {
  const isEnabled = canDragNode(node);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useDraggable({
    id: node.id,
    disabled: !isEnabled,
    data: {
      id: node.id,
      node,
      data: node.data,
    },
  });

  const listenersRef = useRef(listeners);
  listenersRef.current = listeners;

  const detachRef = useRef<(() => void) | null>(null);

  /* Attached in the ref callback rather than an effect: an effect re-binds every
     row's listener on each render, and holding the element in state made every
     row render twice on mount. */
  const dragHandle: DragHandleRef = useCallback(
    (element: HTMLElement | null) => {
      setNodeRef(element);
      setActivatorNodeRef(element);
      detachRef.current?.();
      detachRef.current = null;
      if (!element) return;

      const cleanupFns: (() => void)[] = [];

      /* TouchSensor turns a press and hold into a drag, so the list can still be
         scrolled by swiping across a row. Leave a consumer's own inline
         touch-action alone, and don't touch rows that can't drag. */
      if (isEnabled && !element.style.touchAction) {
        element.style.touchAction = "manipulation";
        cleanupFns.push(() => {
          element.style.touchAction = "";
        });
      }

      for (const propName of boundEvents(listenersRef.current)) {
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
        cleanupFns.push(() => element.removeEventListener(eventName, listener));
      }
      detachRef.current = () => cleanupFns.forEach((fn) => fn());
    },
    [isEnabled, setNodeRef, setActivatorNodeRef],
  );

  return { dragHandle, attributes };
}
