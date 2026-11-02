import { useEffect, useRef } from "react";
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

  const registered = useRef<HTMLElement | null>(null);

  /* The outer element is replaced when rowHeight switches between a number and a
     function (FixedSizeList to VariableSizeList), and a late-mounting list sets
     it after the first render, so check after every commit rather than once. */
  useEffect(() => {
    const element = tree.listEl.current;
    if (!element || element === registered.current) return;
    registered.current = element;
    setNodeRef(element);
  });
}
