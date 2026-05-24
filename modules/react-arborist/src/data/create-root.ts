import { NodeApi } from "../interfaces/node-api";
import { TreeApi } from "../interfaces/tree-api";

export const ROOT_ID = "__REACT_ARBORIST_INTERNAL_ROOT__";

export function createRoot<T>(tree: TreeApi<T>): NodeApi<T> {
  function visitSelfAndChildren(data: T, level: number, parent: NodeApi<T> | null) {
    const id = tree.accessId(data);
    const node = new NodeApi<T>({
      tree,
      data,
      level,
      parent,
      id,
      children: null,
      isDraggable: tree.isDraggable(data),
      rowIndex: null,
    });
    const children = tree.accessChildren(data);
    if (children) {
      node.children = children.map((child: T) => visitSelfAndChildren(child, level + 1, node));
    }
    return node;
  }

  const root = new NodeApi<T>({
    tree,
    id: ROOT_ID,
    // @ts-ignore
    data: { id: ROOT_ID },
    level: -1,
    parent: null,
    children: null,
    isDraggable: true,
    rowIndex: null,
  });

  const data: readonly T[] = tree.props.data ?? [];

  root.children = data.map((child) => {
    return visitSelfAndChildren(child, 0, root);
  });

  return root;
}
