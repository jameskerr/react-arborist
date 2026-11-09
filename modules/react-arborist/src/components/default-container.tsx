import { FixedSizeList, VariableSizeList } from "react-window";
import { useDataUpdates, useTreeApi } from "../context.js";
import { ListOuterElement } from "./list-outer-element.js";
import { ListInnerElement } from "./list-inner-element.js";
import { RowContainer } from "./row-container.js";
import { handleTreeKeyDown } from "./handle-tree-key-down.js";

export function DefaultContainer() {
  useDataUpdates();
  const tree = useTreeApi();
  return (
    <div
      role="tree"
      aria-label={tree.props["aria-label"]}
      aria-labelledby={tree.props["aria-labelledby"]}
      aria-multiselectable={!tree.props.disableMultiSelection || undefined}
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
      onKeyDown={(e) => handleTreeKeyDown(e, tree)}
    >
      <List />
    </div>
  );
}

/**
 * Fixed-height trees (numeric rowHeight) render a FixedSizeList, preserving the
 * original O(1) layout and avoiding VariableSizeList's measurement cache. Only
 * the function form, which needs per-row heights, uses VariableSizeList.
 */
function List() {
  const tree = useTreeApi();
  const commonProps = {
    className: tree.props.className,
    outerRef: tree.listEl,
    itemCount: tree.visibleNodes.length,
    height: tree.height,
    width: tree.width,
    overscanCount: tree.overscanCount,
    itemKey: (index: number) => tree.visibleNodes[index]?.id || index,
    outerElementType: tree.props.outerElementType ?? ListOuterElement,
    innerElementType: tree.props.innerElementType ?? ListInnerElement,
    onScroll: tree.props.onScroll,
    onItemsRendered: tree.onItemsRendered.bind(tree),
  };

  if (typeof tree.props.rowHeight === "function") {
    return (
      // @ts-ignore
      <VariableSizeList {...commonProps} itemSize={tree.rowHeightAt} ref={tree.list}>
        {RowContainer}
      </VariableSizeList>
    );
  }

  return (
    // @ts-ignore
    <FixedSizeList {...commonProps} itemSize={tree.rowHeight} ref={tree.list}>
      {RowContainer}
    </FixedSizeList>
  );
}
