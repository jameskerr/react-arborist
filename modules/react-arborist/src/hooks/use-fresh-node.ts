import { useMemo } from "react";
import { useTreeApi } from "../context.js";

export function useFreshNode<T>(index: number) {
  const tree = useTreeApi<T>();
  const original = tree.at(index);
  if (!original) throw new Error(`Could not find node for index: ${index}`);

  return useMemo(() => {
    const fresh = original.clone();
    tree.visibleNodes[index] = fresh; // sneaky
    return fresh;
    /* Return a fresh instance if the state values or the underlying node
       change. Identity alone is not enough: the previous clone is what
       visibleNodes holds, so depending on `original` would clone on every
       render and defeat row memoisation. */
  }, [
    ...Object.values(original.state),
    original.data,
    original.level,
    original.isDraggable,
    original.parent?.id ?? null,
    original.children?.length ?? -1,
  ]);
}
