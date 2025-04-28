import { DragItem } from "../types/dnd";
import { TreeApi } from "../interfaces/tree-api";
import { NodeApi } from "../interfaces/node-api";
import { ComputedDrop, computeDrop } from "./compute-drop";
import { actions as dnd } from "../state/dnd-slice";
import { DropTargetMonitor } from "react-dnd";

export const handleDropComputation = (
  outerDrop: boolean,
  el: { current: HTMLElement | null },
  tree: TreeApi<unknown>,
  node: NodeApi<unknown> | null,
  monitor: DropTargetMonitor<unknown,unknown>
): ComputedDrop|null => {
  const offset = monitor.getClientOffset();
  if (!el.current || !offset) {
    tree.hideCursor();
    return null;
  }
  const prevNode = (outerDrop || node === null) 
                ? tree.visibleNodes[tree.visibleNodes.length - 1] 
                : node.prev;

  return computeDrop({
    element: el.current,
    offset,
    indent: tree.indent,
    node,
    prevNode: prevNode,
    nextNode: node?.next ?? null,
    targetTree: tree,
  });
};

export const getDropResultOrNull = (result: ComputedDrop | null) => {
  return result?.drop ?? null;
}

export const createDropHandlers = (
  outerDrop: boolean,
  el: { current: HTMLElement | null },
  tree: TreeApi<unknown>,
  node: NodeApi<unknown> | null = null
) => ({
  canDrop: (_item: DragItem, monitor: DropTargetMonitor<unknown,unknown>) => {
    if (_item.sourceTree.props.id !== tree.props.id && tree.props.allowCrossTreeDrop === false) {
      return false;
    }

    if (_item.sourceTree.props.id !== tree.props.id && _item.sourceTree.props.allowCrossTreeDrag === false) {
      return false;
    }

    const result = handleDropComputation(outerDrop, el, tree, node, monitor);
    return tree.canDrop(
      _item.sourceTree,
      getDropResultOrNull(result)
    );
  },

  hover: (_item: DragItem, monitor: DropTargetMonitor<unknown,unknown>) => {
    if (!outerDrop && _item.sourceTree.state.dnd.lastTree !== tree) {
      _item.sourceTree.state.dnd.lastTree?.hideCursor();
      _item.sourceTree.dispatch(dnd.setLastTree(tree));
    }

    if (outerDrop && !monitor.isOver({ shallow: true })) return;

    const result = handleDropComputation(outerDrop, el, tree, node, monitor);
    if (result?.drop) {
      tree.dispatch(dnd.hovering(result.drop.parentId, result.drop.index));
    }

    if (tree.canDrop(_item.sourceTree, getDropResultOrNull(result))) {
      if (result?.cursor) tree.showCursor(result.cursor);
    } else {
      tree.hideCursor();
    }
  },

  drop: (_item: DragItem, monitor: DropTargetMonitor<unknown,unknown>) => {
    if(outerDrop && monitor.didDrop()) return;

    //const result = handleDropComputation(outerDrop, el, tree, node, monitor);
    if (!monitor.canDrop()) return;

    tree.hideCursor();
    return {
      parentId: tree.state.dnd.parentId,
      index: tree.state.dnd.index,
      targetTree: tree
    };
  }
});