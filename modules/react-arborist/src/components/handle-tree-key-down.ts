import type React from "react";
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

function handleBackspace<T>(tree: TreeApi<T>) {
  if (!tree.props.onDelete) return;
  const ids = Array.from(tree.selectedIds);
  if (ids.length > 1) {
    let nextFocus = tree.mostRecentNode;
    while (nextFocus && nextFocus.isSelected) {
      nextFocus = nextFocus.nextSibling;
    }
    if (!nextFocus) nextFocus = tree.lastNode;
    tree.focus(nextFocus, { scroll: false });
    tree.delete(Array.from(ids));
    return;
  }

  const node = tree.focusedNode;
  if (!node) return;
  const sib = node.nextSibling;
  const parent = node.parent;
  tree.focus(sib || parent, { scroll: false });
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

function handleArrowRight<T>(tree: TreeApi<T>) {
  const node = tree.focusedNode;
  if (!node) return;
  if (node.isInternal && node.isOpen) {
    tree.focus(tree.nextNode);
  } else if (node.isInternal) {
    tree.open(node.id);
  }
}

function handleArrowLeft<T>(tree: TreeApi<T>) {
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

function handleEnter<T>(tree: TreeApi<T>) {
  const node = tree.focusedNode;
  if (!node || !node.isEditable || !tree.props.onRename) return;
  setTimeout(() => {
    if (node) tree.edit(node);
  });
}

function handleTypeahead<T>(key: string, tree: TreeApi<T>) {
  const search = searchFor(tree);
  if (search.timeout) clearTimeout(search.timeout);
  search.term += key;
  search.timeout = setTimeout(() => {
    search.term = "";
  }, 600);

  const node = tree.visibleNodes.find((n) => {
    const name = (n.data as { name?: unknown })?.name;
    if (typeof name === "string") {
      return name.toLowerCase().startsWith(search.term);
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
  const command = e.metaKey || e.ctrlKey;
  if (command) {
    if (tree.props.disableMultiSelection) return;
    e.preventDefault();
    tree.selectAll();
  } else if (tree.props.onCreate) {
    tree.createLeaf();
  }
}

function handleCreateFolder<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  if (e.metaKey || e.ctrlKey) return;
  if (tree.props.onCreate) tree.createInternal();
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

function handleBackspaceKey<T>(_e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  handleBackspace(tree);
}

type KeyHandler = <T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) => void;

/* One entry per command, keyed by KeyboardEvent.key. A key that isn't listed
   falls through to type-to-find. */
const KEY_HANDLERS: Record<string, KeyHandler> = {
  Backspace: handleBackspaceKey,
  Tab: handleTab,
  ArrowDown: handleArrowDown,
  ArrowUp: handleArrowUp,
  ArrowRight: (_e, tree) => handleArrowRight(tree),
  ArrowLeft: (_e, tree) => handleArrowLeft(tree),
  a: handleCreateWithKey,
  A: handleCreateFolder,
  Home: handleHome,
  End: handleEnd,
  Enter: (_e, tree) => handleEnter(tree),
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

  handleTypeahead(e.key, tree);
}
