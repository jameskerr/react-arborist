import { useMemo } from "react";
import { useTreeApi } from "../context";

export function useFreshNode<T>(index: number) {
  const tree = useTreeApi<T>();
  const original = tree.at(index);
  if (!original) throw new Error(`Could not find node for index: ${index}`);

  return useMemo(() => {
    const fresh = original.clone();
    tree.visibleNodes[index] = fresh; // sneaky
    return fresh;
    // Return a fresh instance if the state values change
  }, [...Object.values(original.state), original]);
}
