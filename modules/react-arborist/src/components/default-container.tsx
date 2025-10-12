import { FixedSizeList } from "react-window";
import { useDataUpdates, useTreeApi } from "../context";
import { focusNextElement, focusPrevElement } from "../utils";
import { ListOuterElement } from "./list-outer-element";
import { ListInnerElement } from "./list-inner-element";
import { RowContainer } from "./row-container";

let focusSearchTerm = "";
let timeoutId: any = null;

/**
 * All these keyboard shortcuts seem like they should be configurable.
 * Each operation should be a given a name and separated from
 * the event handler. Future clean up welcome.
 */
export function DefaultContainer() {
  useDataUpdates();
  const tree = useTreeApi();
  return (
    <div
      role="tree"
      style={{
        height: tree.height,
        width: tree.width,
        minHeight: 0,
        minWidth: 0,
      }}
      onContextMenu={tree.props.onContextMenu}
      onClick={tree.props.onClick}
      tabIndex={0}
      onFocus={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          tree.onFocus();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          tree.onBlur();
        }
      }}
      onKeyDown={(e) => {
        if (tree.isEditing) {
          return;
        }
        if (e.key === "Backspace") {
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
          } else {
            const node = tree.focusedNode;
            if (node) {
              const sib = node.nextSibling;
              const parent = node.parent;
              tree.focus(sib || parent, { scroll: false });
              tree.delete(node);
            }
          }
          return;
        }
        if (e.key === "Tab" && !e.shiftKey) {
          e.preventDefault();
          focusNextElement(e.currentTarget);
          return;
        }
        if (e.key === "Tab" && e.shiftKey) {
          e.preventDefault();
          focusPrevElement(e.currentTarget);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = tree.nextNode;
          if (e.metaKey) {
            tree.select(tree.focusedNode);
            tree.activate(tree.focusedNode);
            return;
          } else if (!e.shiftKey || tree.props.disableMultiSelection) {
            tree.focus(next);
            return;
          } else {
            if (!next) return;
            const current = tree.focusedNode;
            if (!current) {
              tree.focus(tree.firstNode);
            } else if (current.isSelected) {
              tree.selectContiguous(next);
            } else {
              tree.selectMulti(next);
            }
            return;
          }
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = tree.prevNode;
          if (!e.shiftKey || tree.props.disableMultiSelection) {
            tree.focus(prev);
            return;
          } else {
            if (!prev) return;
            const current = tree.focusedNode;
            if (!current) {
              tree.focus(tree.lastNode); // ?
            } else if (current.isSelected) {
              tree.selectContiguous(prev);
            } else {
              tree.selectMulti(prev);
            }
            return;
          }
        }
        if (e.key === "ArrowRight") {
          const node = tree.focusedNode;
          if (!node) return;
          if (node.isInternal && node.isOpen) {
            tree.focus(tree.nextNode);
          } else if (node.isInternal) tree.open(node.id);
          return;
        }
        if (e.key === "ArrowLeft") {
          const node = tree.focusedNode;
          if (!node || node.isRoot) return;
          if (node.isInternal && node.isOpen) tree.close(node.id);
          else if (!node.parent?.isRoot) {
            tree.focus(node.parent);
          }
          return;
        }
        if (e.key === "a" && e.metaKey && !tree.props.disableMultiSelection) {
          e.preventDefault();
          tree.selectAll();
          return;
        }
        if (e.key === "a" && !e.metaKey && tree.props.onCreate) {
          tree.createLeaf();
          return;
        }
        if (e.key === "A" && !e.metaKey) {
          if (!tree.props.onCreate) return;
          tree.createInternal();
          return;
        }

        if (e.key === "Home") {
          // add shift keys
          e.preventDefault();
          tree.focus(tree.firstNode);
          return;
        }
        if (e.key === "End") {
          // add shift keys
          e.preventDefault();
          tree.focus(tree.lastNode);
          return;
        }
        if (e.key === "Enter") {
          const node = tree.focusedNode;
          if (!node) return;
          if (!node.isEditable || !tree.props.onRename) return;
          setTimeout(() => {
            if (node) tree.edit(node);
          });
          return;
        }
        if (e.key === " ") {
          e.preventDefault();
          const node = tree.focusedNode;
          if (!node) return;
          if (node.isLeaf) {
            node.select();
            node.activate();
          } else {
            node.toggle();
          }
          return;
        }
        if (e.key === "*") {
          const node = tree.focusedNode;
          if (!node) return;
          tree.openSiblings(node);
          return;
        }
        if (e.key === "PageUp") {
          e.preventDefault();
          tree.pageUp();
          return;
        }
        if (e.key === "PageDown") {
          e.preventDefault();
          tree.pageDown();
        }

        // If they type a sequence of characters
        // collect them. Reset them after a timeout.
        // Use it to search the tree for a node, then focus it.
        // Clean this up a bit later
        clearTimeout(timeoutId);
        focusSearchTerm += e.key;
        timeoutId = setTimeout(() => {
          focusSearchTerm = "";
        }, 600);
        const node = tree.visibleNodes.find((n) => {
          // @ts-ignore
          const name = n.data.name;
          if (typeof name === "string") {
            return name.toLowerCase().startsWith(focusSearchTerm);
          } else return false;
        });
        if (node) tree.focus(node.id);
      }}
    >
      {/* @ts-ignore */}
      <FixedSizeList
        className={tree.props.className}
        outerRef={tree.listEl}
        itemCount={tree.visibleNodes.length}
        height={tree.height}
        width={tree.width}
        itemSize={tree.rowHeight}
        overscanCount={tree.overscanCount}
        itemKey={(index) => tree.visibleNodes[index]?.id || index}
        outerElementType={tree.props.outerElementType || ListOuterElement}
        innerElementType={tree.props.innerElementType || ListInnerElement}
        onScroll={tree.props.onScroll}
        onItemsRendered={tree.onItemsRendered.bind(tree)}
        ref={tree.list}
      >
        {RowContainer}
      </FixedSizeList>
    </div>
  );
}
