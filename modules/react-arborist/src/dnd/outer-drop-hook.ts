import { useDrop } from "react-dnd";
import { useTreeApi } from "../context";
import { DragItem } from "../types/dnd";
import { computeDrop, isTopPaddingDrop } from "./compute-drop";
import { DropResult } from "./drop-hook";

export function useOuterDrop() {
  const tree = useTreeApi();

  // In case we drop an item at the bottom of the list
  const [, drop] = useDrop<DragItem, DropResult | null, { isOver: boolean }>(
    () => ({
      accept: "NODE",
      canDrop: (_item, m) => {
        if (!m.isOver({ shallow: true })) return false;
        return tree.canDrop();
      },
      hover: (_item, m) => {
        if (!m.isOver({ shallow: true })) return;
        const offset = m.getClientOffset();
        if (!tree.listEl.current || !offset) return;
        const paddingTop = tree.props.padding ?? tree.props.paddingTop ?? 0;
        const firstNode = tree.visibleNodes[0] ?? null;
        const hoveringTopPadding =
          firstNode != null &&
          isTopPaddingDrop(tree.listEl.current, offset, paddingTop, tree.scrollOffset);
        const { cursor, drop } = computeDrop({
          element: tree.listEl.current,
          initialOffset: m.getInitialClientOffset(),
          offset: offset,
          indent: tree.indent,
          node: null,
          prevNode: hoveringTopPadding ? null : tree.visibleNodes[tree.visibleNodes.length - 1],
          nextNode: hoveringTopPadding ? firstNode : null,
          sourceLevel: tree.dragNode?.level,
        });
        tree.hover(drop, cursor);
      },
      drop: (_item, m) => {
        if (!m.isOver({ shallow: true })) return null;
        if (!m.canDrop()) return null;
        tree.drop();
      },
    }),
    [tree],
  );

  drop(tree.listEl);
}
