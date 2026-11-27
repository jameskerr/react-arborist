import { useSyncExternalStore } from "react";
import { useTreeApi } from "../context.js";
import type { TreeApi } from "../interfaces/tree-api.js";

/* What the drop destination means to a single row. A row reads the destination
   through its own place in the tree — it is the destination (willReceiveDrop),
   or it sits inside it (a highlighted target subtree, an insertion marker). A
   row outside the destination's subtree cannot tell that the destination moved
   within another one, so it has nothing to repaint. A root-level destination
   has no parent row, and every row sits inside the root. */
function destinationFor(tree: TreeApi<any>, id: string) {
  const { destinationParentId, destinationIndex } = tree.state.dnd;
  if (destinationParentId === null && destinationIndex === null) return null;
  const parent = tree.dragDestinationParent;
  if (parent && !parent.isAncestorOf(tree.get(id))) return null;
  /* JSON keeps a root-level null parent distinct from a node whose id is "null". */
  return JSON.stringify([destinationParentId, destinationIndex]);
}

/**
 * Re-render a row when the drop destination it can observe changes. The
 * destination is deliberately kept out of NodesContext, which every visible row
 * consumes: subscribing per row means a hover repaints the rows that enter and
 * leave the destination instead of the whole list.
 */
export function useDestinationUpdates(id: string) {
  const tree = useTreeApi();
  return useSyncExternalStore(
    tree.store.subscribe,
    () => destinationFor(tree, id),
    () => null,
  );
}
