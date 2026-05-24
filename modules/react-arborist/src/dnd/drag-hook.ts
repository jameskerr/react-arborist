import { useEffect } from "react";
import { ConnectDragSource, useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { useTreeApi } from "../context";
import { NodeApi } from "../interfaces/node-api";
import { DragItem } from "../types/dnd";
import { DropResult } from "./drop-hook";
import { actions as dnd } from "../state/dnd-slice";

export function useDragHook<T>(node: NodeApi<T>): ConnectDragSource {
  const tree = useTreeApi();
  const ids = tree.selectedIds;
  const [_, ref, preview] = useDrag<DragItem, DropResult, void>(
    () => ({
      canDrag: () => node.isDraggable,
      type: "NODE",
      item: () => {
        // This is fired once at the begging of a drag operation
        const dragIds = tree.isSelected(node.id) ? Array.from(ids) : [node.id];
        tree.dispatch(dnd.dragStart(node.id, dragIds));
        return { id: node.id, dragIds };
      },
      end: () => {
        tree.hideCursor();
        tree.redrawList();
        tree.dispatch(dnd.dragEnd());
      },
    }),
    [ids, node],
  );

  useEffect(() => {
    preview(getEmptyImage());
  }, [preview]);

  return ref;
}
