import { NodeApi } from "../interfaces/node-api";
import { TreeApi } from "../interfaces/tree-api";

export type ListResult<T> = {
  /* The flattened, currently-visible rows. */
  list: NodeApi<T>[];
  /* How many nodes match the search term across the whole tree (0 when not
     filtered). Counted here so consumers reading tree.filteredCount don't
     trigger a second full traversal. */
  matchCount: number;
};

export function createList<T>(tree: TreeApi<T>): ListResult<T> {
  if (tree.isFiltered) {
    return flattenAndFilterTree(tree.root, tree.isMatch.bind(tree));
  } else {
    return { list: flattenTree(tree.root), matchCount: 0 };
  }
}

function flattenTree<T>(root: NodeApi<T>): NodeApi<T>[] {
  const list: NodeApi<T>[] = [];
  function collect(node: NodeApi<T>) {
    if (node.level >= 0) {
      list.push(node);
    }
    if (node.isOpen) {
      node.children?.forEach(collect);
    }
  }
  collect(root);
  list.forEach(assignRowIndex);
  return list;
}

function flattenAndFilterTree<T>(
  root: NodeApi<T>,
  isMatch: (n: NodeApi<T>) => boolean,
): ListResult<T> {
  const matches: Record<string, boolean> = {};
  const list: NodeApi<T>[] = [];
  let matchCount = 0;

  function markMatch(node: NodeApi<T>) {
    const yes = !node.isRoot && isMatch(node);
    if (yes) {
      matchCount++;
      matches[node.id] = true;
      let parent = node.parent;
      while (parent) {
        matches[parent.id] = true;
        parent = parent.parent;
      }
    }
    if (node.children) {
      for (let child of node.children) markMatch(child);
    }
  }

  function collect(node: NodeApi<T>) {
    if (node.level >= 0 && matches[node.id]) {
      list.push(node);
    }
    if (node.isOpen) {
      node.children?.forEach(collect);
    }
  }

  markMatch(root);
  collect(root);
  list.forEach(assignRowIndex);
  return { list, matchCount };
}

function assignRowIndex(node: NodeApi<any>, index: number) {
  node.rowIndex = index;
}
