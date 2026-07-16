import { useEffect } from "react";
import { ConnectDragSource, useDrag } from "react-dnd";
import { useTreeApi } from "../context";
import { NodeApi } from "../interfaces/node-api";
import { DragItem } from "../types/dnd";
import { TreeProps } from "../types/tree-props";
import { isErrorWithCode } from "../utils";
import { DropResult } from "./drop-hook";
import { actions as dnd } from "../state/dnd-slice";

/* The react-dnd item type a row's drag source broadcasts. The dragType prop
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

export function useDragHook<T>(node: NodeApi<T>): ConnectDragSource {
  const tree = useTreeApi<T>();
  const ids = tree.selectedIds;
  const [_, ref, preview] = useDrag<DragItem<T>, DropResult, void>(
    () => ({
      canDrag: () => canDragNode(node),
      type: dragTypeForNode(tree.props.dragType, node),
      item: () => {
        // This is fired once at the beginning of a drag operation
        const dragIds = tree.isSelected(node.id) ? Array.from(ids) : [node.id];
        tree.dispatch(dnd.dragStart(node.id, dragIds));
        return { id: node.id, dragIds, data: node.data };
      },
      end: () => {
        tree.hideCursor();
        tree.redrawList();
        tree.dispatch(dnd.dragEnd());
      },
    }),
    [ids, node, tree.props.dragType],
  );

  useEffect(() => {
    // Suppress the browser's ghost-image only when html5-backend is installed.
    // Custom-backend users may omit html5-backend; the fallback is the native drag preview.
    // A one-tick async delay is imperceptible for a cosmetic preview, so there's
    // no need for a require() fast path here — always load via import().
    let cancelled = false;
    import("react-dnd-html5-backend").then(
      (mod) => {
        if (!cancelled) preview(mod.getEmptyImage());
      },
      (err: unknown) => {
        if (cancelled) return;
        // Not-installed is expected (optional dependency) — native drag preview
        // is an acceptable fallback. Anything else is unexpected and shouldn't
        // be swallowed silently. Rethrow outside the promise chain so React
        // (and the runtime) see a real throw instead of an unhandled rejection.
        if (!isErrorWithCode(err, "MODULE_NOT_FOUND") && !isErrorWithCode(err, "ERR_MODULE_NOT_FOUND")) {
          queueMicrotask(() => {
            if (!cancelled) throw err;
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [preview]);

  return ref;
}
