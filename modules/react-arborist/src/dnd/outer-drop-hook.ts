import { useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useTreeApi } from "../context.js";

export const OUTER_DROP_ID = "__REACT_ARBORIST_OUTER_DROP__";

export function useOuterDrop() {
  const tree = useTreeApi();
  const { setNodeRef } = useDroppable({
    id: OUTER_DROP_ID,
    data: {
      isOuterDrop: true,
    },
  });

  useEffect(() => {
    if (tree.listEl.current) {
      setNodeRef(tree.listEl.current);
    }
  }, [setNodeRef, tree.listEl]);
}
