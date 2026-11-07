import type React from "react";
import type { NodeApi } from "../interfaces/node-api.js";
import type { TreeApi } from "../interfaces/tree-api.js";
import { focusNextElement, focusPrevElement } from "../utils.js";

/* The type-to-find buffer belongs to one tree. Keeping it module-level meant
   two trees on the same page typed into one shared search term. */
type Search = { term: string; timeout: ReturnType<typeof setTimeout> | null };
const searches = new WeakMap<object, Search>();

function searchFor(tree: object): Search {
  let search = searches.get(tree);
  if (!search) {
    search = { term: "", timeout: null };
    searches.set(tree, search);
  }
  return search;
}

function isEditableTarget(target: EventTarget | null, currentTarget: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target !== currentTarget &&
    Boolean(
      target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"),
    )
  );
}

function findUnselectedFallback<T>(tree: TreeApi<T>, ids: string[]): NodeApi<T> | null {
  const idSet = new Set(ids);
  const nodes = tree.visibleNodes;
  const selectedIndices = nodes.map((n, i) => (idSet.has(n.id) ? i : -1)).filter((i) => i !== -1);

  if (selectedIndices.length === 0) return null;

  const maxIndex = Math.max(...selectedIndices);
  for (let i = maxIndex + 1; i < nodes.length; i++) {
    if (!idSet.has(nodes[i].id)) return nodes[i];
  }

  const minIndex = Math.min(...selectedIndices);
  for (let i = minIndex - 1; i >= 0; i--) {
    if (!idSet.has(nodes[i].id)) return nodes[i];
  }

  return null;
}

function handleBackspace<T>(_e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  if (!tree.props.onDelete) return;
  const ids = Array.from(tree.selectedIds);
  if (ids.length > 1) {
    let nextFocus = tree.mostRecentNode;
    while (nextFocus && nextFocus.isSelected) {
      nextFocus = nextFocus.nextSibling;
    }
    if (!nextFocus || nextFocus.isSelected) {
      nextFocus = findUnselectedFallback(tree, ids);
    }
    if (nextFocus) tree.focus(nextFocus, { scroll: false });
    tree.delete(ids);
    return;
  }

  const node = tree.focusedNode;
  if (!node) return;
  const sib = node.nextSibling;
  const parent = node.parent && !node.parent.isRoot ? node.parent : null;
  const next = sib || parent || node.prev;
  if (next) tree.focus(next, { scroll: false });
  tree.delete(node);
}

function handleArrowDown<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  e.preventDefault();
  const next = tree.nextNode;

  if (e.metaKey) {
    tree.select(tree.focusedNode);
    tree.activate(tree.focusedNode);
    return;
  }

  if (!e.shiftKey || tree.props.disableMultiSelection) {
    tree.focus(next);
    return;
  }

  if (!next) return;
  const current = tree.focusedNode;
  if (!current) {
    tree.focus(tree.firstNode);
  } else if (current.isSelected) {
    tree.selectContiguous(next);
  } else {
    tree.selectMulti(next);
  }
}

function handleArrowUp<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  e.preventDefault();
  const prev = tree.prevNode;

  if (!e.shiftKey || tree.props.disableMultiSelection) {
    tree.focus(prev);
    return;
  }

  if (!prev) return;
  const current = tree.focusedNode;
  if (!current) {
    tree.focus(tree.lastNode);
  } else if (current.isSelected) {
    tree.selectContiguous(prev);
  } else {
    tree.selectMulti(prev);
  }
}

function handleArrowRight<T>(_e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  const node = tree.focusedNode;
  if (!node) return;
  if (node.isInternal && node.isOpen) {
    tree.focus(tree.nextNode);
  } else if (node.isInternal) {
    tree.open(node.id);
  }
}

function handleArrowLeft<T>(_e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  const node = tree.focusedNode;
  if (!node || node.isRoot) return;
  if (node.isInternal && node.isOpen) {
    tree.close(node.id);
  } else if (!node.parent?.isRoot) {
    tree.focus(node.parent);
  }
}

function handleSpace<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  e.preventDefault();
  const node = tree.focusedNode;
  if (!node) return;
  if (node.isLeaf) {
    node.select();
    node.activate();
  } else {
    node.toggle();
  }
}

function handleEnter<T>(_e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  const node = tree.focusedNode;
  if (!node || !node.isEditable || !tree.props.onRename) return;
  setTimeout(() => {
    tree.edit(node);
  });
}

function handleTypeahead<T>(key: string, tree: TreeApi<T>) {
  const search = searchFor(tree);
  if (search.timeout) clearTimeout(search.timeout);
  search.term += key.toLowerCase();
  search.timeout = setTimeout(() => {
    search.term = "";
  }, 600);

  const node = tree.visibleNodes.find((n) => {
    const data = n.data;
    if (data && typeof data === "object" && "name" in data && typeof data.name === "string") {
      return data.name.toLowerCase().startsWith(search.term);
    }
    return false;
  });

  if (node) tree.focus(node.id);
}

function handleTab<T>(e: React.KeyboardEvent<HTMLDivElement>, _tree: TreeApi<T>) {
  e.preventDefault();
  if (e.shiftKey) {
    focusPrevElement(e.currentTarget);
  } else {
    focusNextElement(e.currentTarget);
  }
}

function handleCreateWithKey<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  if (e.metaKey || e.ctrlKey) {
    if (tree.props.disableMultiSelection) return;
    e.preventDefault();
    tree.selectAll();
  } else if (tree.props.onCreate) {
    tree.createLeaf();
  } else {
    handleTypeahead(e.key, tree);
  }
}

function handleCreateFolder<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  if (e.metaKey || e.ctrlKey) return;
  if (tree.props.onCreate) {
    tree.createInternal();
  } else {
    handleTypeahead(e.key, tree);
  }
}

function handleOpenSiblings<T>(_e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  const node = tree.focusedNode;
  if (node) tree.openSiblings(node);
}

function handleHome<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  e.preventDefault();
  tree.focus(tree.firstNode);
}

function handleEnd<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  e.preventDefault();
  tree.focus(tree.lastNode);
}

function handlePageUp<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  e.preventDefault();
  tree.pageUp();
}

function handlePageDown<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  e.preventDefault();
  tree.pageDown();
}

type KeyHandler = <T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) => void;

/* One entry per command, keyed by KeyboardEvent.key. A key that isn't listed
   falls through to type-to-find. */
const KEY_HANDLERS: Record<string, KeyHandler> = {
  Backspace: handleBackspace,
  Tab: handleTab,
  ArrowDown: handleArrowDown,
  ArrowUp: handleArrowUp,
  ArrowRight: handleArrowRight,
  ArrowLeft: handleArrowLeft,
  a: handleCreateWithKey,
  A: handleCreateFolder,
  Home: handleHome,
  End: handleEnd,
  Enter: handleEnter,
  " ": handleSpace,
  "*": handleOpenSiblings,
  PageUp: handlePageUp,
  PageDown: handlePageDown,
};

export function handleTreeKeyDown<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  if (tree.isEditing) return;
  if (isEditableTarget(e.target, e.currentTarget)) return;

  const handler = KEY_HANDLERS[e.key];
  if (handler) {
    handler(e, tree);
    return;
  }

  /* Non-character keys (Escape, F5, etc.) and modified shortcuts (Cmd+C, Ctrl+V)
     must not be appended to the typeahead search term. */
  if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

  handleTypeahead(e.key, tree);
}
