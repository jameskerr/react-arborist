import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useDataUpdates, useNodesContext, useTreeApi } from "../context";
import { useDragHook } from "../dnd/drag-hook";
import { useDropHook } from "../dnd/drop-hook";
import { useFreshNode } from "../hooks/use-fresh-node";

type Props = {
  style: React.CSSProperties;
  index: number;
};

export const RowContainer = React.memo(function RowContainer<T>({
  index,
  style,
}: Props) {
  /* When will the <Row> will re-render.
   *
   * The row component is memo'd so it will only render
   * when a new instance of the NodeApi class is passed
   * to it.
   *
   * The TreeApi instance is stable. It does not
   * change when the internal state changes.
   *
   * The TreeApi has all the references to the nodes.
   * We need to clone the nodes when their state
   * changes. The node class contains no state itself,
   * It always checks the tree for state. The tree's
   * state will always be up to date.
   */

  useDataUpdates(); // Re-render when tree props or visability changes
  const _ = useNodesContext(); // So that we re-render appropriately
  const tree = useTreeApi<T>(); // Tree already has the fresh state
  const node = useFreshNode<T>(index);

  const el = useRef<HTMLDivElement | null>(null);
  const dragRef = useDragHook<T>(node);
  const dropRef = useDropHook(el, node);
  const innerRef = useCallback(
    (n: any) => {
      el.current = n;
      dropRef(n);
    },
    [dropRef]
  );

  const indent = tree.indent * node.level;
  const nodeStyle = useMemo(() => ({ paddingLeft: indent }), [indent]);
  const rowStyle = useMemo(
    () => ({
      ...style,
      top:
        parseFloat(style.top as string) +
        tree.paddingTop,
        left:
        parseFloat(style.left as string) +
        tree.paddingLeft,
    }),
    [style, tree.paddingTop, tree.paddingLeft]
  );
  const rowAttrs: React.HTMLAttributes<any> = {
    role: "treeitem",
    "aria-level": node.level + 1,
    "aria-selected": node.isSelected,
    "aria-expanded": node.isOpen,
    style: rowStyle,
    tabIndex: -1,
    className: tree.props.rowClassName,
  };

  useEffect(() => {
    if (!node.isEditing && node.isFocused) {
      el.current?.focus({ preventScroll: true });
    }
  }, [node.isEditing, node.isFocused, el.current]);

  const Node = tree.renderNode;
  const Row = tree.renderRow;

  return (
    <Row node={node} innerRef={innerRef} attrs={rowAttrs}>
      <Node node={node} tree={tree} style={nodeStyle} dragHandle={dragRef} />
    </Row>
  );
});
