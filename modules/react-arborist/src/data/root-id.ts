/* Internal sentinel shared by the node graph, the tree API and drop logic.
   Lives in its own module so those can import it without a cycle, and stays
   out of the public surface (index.ts does not re-export this file). */
export const ROOT_ID = "__REACT_ARBORIST_INTERNAL_ROOT__";
