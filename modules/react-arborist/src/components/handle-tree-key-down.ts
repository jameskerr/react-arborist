import type React from "react";
import type { NodeApi } from "../interfaces/node-api.js";
import type { TreeApi } from "../interfaces/tree-api.js";
import { dfs, focusNextElement, focusPrevElement } from "../utils.js";

function isEditableTarget(target: EventTarget | null, currentTarget: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target !== currentTarget &&
    Boolean(
      target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"),
    )
  );
}

/* The raw selection/focus ids can point inside a collapsed folder, where
   tree.get() returns null because the node is not in idToIndex. Walk up to the
   nearest ancestor that is currently visible. */
function visibleAnchor<T>(tree: TreeApi<T>, id: string | null): NodeApi<T> | null {
  let node = id ? (dfs(tree.root, id) as NodeApi<T> | null) : null;
  while (node && !(node.id in tree.idToIndex)) node = node.parent as NodeApi<T> | null;
  return node && !node.isRoot ? node : null;
}

/* Focus the nearest visible row that survives deleting `ids`. A selected folder
   takes its descendants with it, so those are skipped even though only the
   folder's id is in the selection. */
function nextFocusAfterDelete<T>(tree: TreeApi<T>, ids: string[]): NodeApi<T> | null {
  const nodes = tree.visibleNodes;
  const idSet = new Set(ids);
  const survives = (node: NodeApi<T>) => {
    for (let n: NodeApi<T> | null = node; n; n = n.parent) {
      if (idSet.has(n.id)) return false;
    }
    return true;
  };

  /* The most recently selected row is the one under the cursor. When it sits
     inside a collapsed folder, the raw id is not visible; walk up to the
     folder itself, or fall back to the focused row. */
  const selection = tree.state.nodes.selection.mostRecent;
  const anchor = visibleAnchor(tree, selection) ?? visibleAnchor(tree, tree.state.nodes.focus.id);
  const start = Math.max(anchor?.rowIndex ?? 0, 0);

  for (let i = start; i < nodes.length; i++) {
    if (survives(nodes[i])) return nodes[i];
  }
  for (let i = Math.min(start - 1, nodes.length - 1); i >= 0; i--) {
    if (survives(nodes[i])) return nodes[i];
  }
  return null;
}

function handleBackspace<T>(_e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  if (!tree.props.onDelete) return;
  /* Delete what is selected, not merely what is focused: arrow keys move focus
     without selecting, and Backspace must not delete that row. A focus with no
     selection still deletes the focused row, as before. */
  const ids = tree.selectedIds.size
    ? Array.from(tree.selectedIds)
    : tree.focusedNode
      ? [tree.focusedNode.id]
      : [];
  if (ids.length === 0) return;

  const nextFocus = nextFocusAfterDelete(tree, ids);
  if (nextFocus) tree.focus(nextFocus, { scroll: false });
  tree.delete(ids);
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
  /* While a type-to-find term is pending, Space extends the search so names
     with spaces can be typed, the way native listboxes behave. */
  if (tree.isSearching) {
    tree.typeahead(" ");
    return;
  }
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
    /* Take the shortcut even when multi-selection is off; otherwise the
       browser selects the whole page instead. */
    e.preventDefault();
    if (tree.props.disableMultiSelection) return;
    tree.selectAll();
  } else if (tree.props.onCreate) {
    tree.createLeaf();
  } else {
    tree.typeahead(e.key);
  }
}

function handleCreateFolder<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  if (e.metaKey || e.ctrlKey) return;
  if (tree.props.onCreate) {
    tree.createInternal();
  } else {
    tree.typeahead(e.key);
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

  /* Non-character keys (Escape, F5) and shortcuts (Cmd+C, Ctrl+V) must not
     reach the typeahead. AltGr reports ctrlKey+altKey and macOS Option-composed
     letters report altKey, so those still count as characters. A plain
     Alt+letter on Windows/Linux (Alt+D focuses the address bar) does not. */
  if (e.key.length !== 1) return;
  if (e.metaKey || (e.ctrlKey && !e.altKey)) return;
  if (e.altKey && !e.getModifierState("AltGraph") && /^[a-z0-9]$/i.test(e.key)) return;

  tree.typeahead(e.key);
}
