import { useDrop } from "react-dnd";
import { useTreeApi } from "../context";
import { DragItem } from "../types/dnd";
import { createDropHandlers } from "./_drop-utils";
import { DropResult } from "./drop-hook";


export function useOuterDrop() {
  
  const tree = useTreeApi();
  const [_, drop] = useDrop<DragItem, DropResult | null, void>(
    () => ({
      accept: "NODE",
      ...createDropHandlers(true, tree.listEl, tree, null)
    }),
    [tree]
  );

  drop(tree.listEl);
}
