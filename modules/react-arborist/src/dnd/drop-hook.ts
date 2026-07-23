import { RefObject } from "react";
import { ConnectDropTarget, useDrop } from "react-dnd";
import { useTreeApi } from "../context";
import { NodeApi } from "../interfaces/node-api";
import { DragItem } from "../types/dnd";
import { computeDrop } from "./compute-drop";

export type DropResult = {
  parentId: string | null;
  index: number | null;
};

export function useDropHook(
  el: RefObject<HTMLElement | null>,
  node: NodeApi<any>,
): ConnectDropTarget {
  const tree = useTreeApi();
  const [_, dropRef] = useDrop<DragItem, DropResult | null, void>(
    () => ({
      accept: "NODE",
      canDrop: () => tree.canDrop(),
      hover: (_item, m) => {
        const offset = m.getClientOffset();
        if (!el.current || !offset) return;
        const { cursor, drop } = computeDrop({
          element: el.current,
          offset: offset,
          indent: tree.indent,
          node: node,
          prevNode: node.prev,
          nextNode: node.next,
        });
        tree.hover(drop, cursor);
      },
      drop: (_, m) => {
        if (!m.canDrop()) return null;
        tree.drop();
      },
    }),
    [node, el.current, tree.props],
  );

  return dropRef;
}
