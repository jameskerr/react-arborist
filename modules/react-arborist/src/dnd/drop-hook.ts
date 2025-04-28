import { RefObject } from "react";
import { ConnectDropTarget, useDrop } from "react-dnd";
import { useTreeApi } from "../context";
import { NodeApi } from "../interfaces/node-api";
import { DragItem } from "../types/dnd";
import { TreeApi } from "../interfaces/tree-api";
import { createDropHandlers } from "./_drop-utils";


export type DropResult = {
  parentId: string | null;
  index: number | null;
  targetTree: TreeApi<unknown> | null;
};


export function useDropHook(
  el: RefObject<HTMLElement | null>,
  node: NodeApi<any>
): ConnectDropTarget {
  
  const tree = useTreeApi();
  const [_, dropRef] = useDrop<DragItem, DropResult | null, void>(
    () => ({
      accept: "NODE",
      ...createDropHandlers(false, el, tree, node)
    }),
    [node, el.current, tree.props]
  );

  return dropRef;
}
