
import { ConnectDragSource, useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { useTreeApi } from "../context";
import { NodeApi } from "../interfaces/node-api";
import { DragItem } from "../types/dnd";
import { DropResult } from "./drop-hook";
import { actions as dnd } from "../state/dnd-slice";
import { safeRun } from "../utils";
import { ROOT_ID } from "../data/create-root";
import { useEffect } from "react";

export function useDragHook<T>(node: NodeApi<T>): ConnectDragSource {
  const tree = useTreeApi();
  const ids = tree.selectedIds;

  const [_, ref, preview] = useDrag<DragItem, DropResult, void>(
    () => ({
      canDrag: () => node.isDraggable,
      type: "NODE",
      item: () => {
        // This is fired once at the beginning of a drag operation
        const dragIds = tree.isSelected(node.id) ? Array.from(ids) : [node.id];
        tree.dispatch(dnd.dragStart(node.id, dragIds));
        tree.dispatch(dnd.setLastTree(tree));
        return { id: node.id, dragIds, sourceTree: tree };
      },
      end: (_item, monitor) => {
        tree.hideCursor();

        const dropResult = monitor.getDropResult();

        if (dropResult && tree.canDrop(_item.sourceTree, dropResult)) {
          const targetTree = dropResult.targetTree;

          const draggedNodes:T[] = [];
          for(const node of tree.dragNodes as NodeApi<T>[]) {
            draggedNodes.push({...node.data});
          }

          // In the same tree, just do a standard move
          if(tree === targetTree) {
            safeRun(tree.props.onMove, {
              dragIds: tree.state.dnd.dragIds,
              parentId: dropResult.parentId === ROOT_ID ? null : dropResult.parentId,
              index: dropResult.index ?? 0, // When it's null it was dropped over a folder
              dragNodes: draggedNodes,
              treeId: tree.props.id
            });
          } else {
            safeRun(tree.props.onCrossTreeDelete, {
              ids: tree.state.dnd.dragIds,
              treeId: tree.props.id
            });

            safeRun(targetTree?.props.onCrossTreeAdd, {
              ids: tree.state.dnd.dragIds,
              parentId: dropResult.parentId === ROOT_ID ? null : dropResult.parentId,
              index: dropResult.index ?? 0, // When it's null it was dropped over a folder
              dragNodes: draggedNodes,
              treeId: targetTree?.props.id
            });
          }

          if (dropResult.parentId && dropResult.parentId !== ROOT_ID && targetTree !==  null) {
            targetTree.open(dropResult.parentId);
          }
        }
        tree.dispatch(dnd.dragEnd());
      },
    }),
    [ids, node]
  );

  useEffect(() => {
    preview(getEmptyImage());
  }, [preview]);

  return ref;
}
