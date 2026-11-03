import { useCallback, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { NodeApi } from "../interfaces/node-api.js";

/* A node can start a drag only when it's draggable and not currently being
   renamed. Without the editing guard, dragging inside the rename input would
   pick the row up and move it (issue #195). */
export function canDragNode<T>(node: NodeApi<T>): boolean {
  return node.isDraggable && !node.isEditing;
}

export type DragHandleRef = (element: HTMLElement | null) => void;

/* dnd-kit returns no listeners while a draggable is disabled, so the activator
   events are attached from a fixed list and dispatched through listenersRef at
   event time. Reading the object once at mount would leave a row that mounted
   disabled with no listeners after it is enabled. */
const ACTIVATOR_PROPS = ["onPointerDown", "onMouseDown", "onTouchStart", "onKeyDown"] as const;

export function useDragHook<T>(node: NodeApi<T>): DragHandleRef {
  const isEnabled = canDragNode(node);

  const { listeners, setNodeRef, setActivatorNodeRef } = useDraggable({
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

      /* TouchSensor turns a press and hold into a drag, so the list can still be
         scrolled by swiping across a row. */
      element.style.touchAction = "manipulation";

      const cleanupFns: (() => void)[] = [];
      for (const propName of ACTIVATOR_PROPS) {
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
    [setNodeRef, setActivatorNodeRef],
  );

  return dragHandle;
}
