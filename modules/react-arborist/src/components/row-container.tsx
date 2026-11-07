import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useDataUpdates, useNodesContext, useTreeApi } from "../context.js";
import { DragHandleRef, useDragHook } from "../dnd/drag-hook.js";
import { useDropHook } from "../dnd/drop-hook.js";
import { useDestinationUpdates } from "../hooks/use-destination-updates.js";
import { useFreshNode } from "../hooks/use-fresh-node.js";
import { NodeApi } from "../interfaces/node-api.js";

type Props = {
  style: React.CSSProperties;
  index: number;
};

type RowViewProps<T> = {
  style: React.CSSProperties;
  node: NodeApi<T>;
  dragRef: DragHandleRef;
  innerRef: (element: HTMLElement | null) => void;
};

/* A row is rendered in two parts. The outer part calls dnd-kit's useDraggable
   and useDroppable: both read dnd-kit's InternalContext, whose value changes
   whenever the hovered row changes. Keeping them out here means that update
   re-renders this small component, not the (arbitrarily expensive) Row and Node
   below (#385). RowView still subscribes to the node and destination state it
   actually paints. */
export const RowContainer = React.memo(function RowContainer<T>({ index, style }: Props) {
  useDataUpdates(); // Re-render when tree props or visability changes
  const _ = useNodesContext(); // So that useFreshNode sees node state changes
  const node = useFreshNode<T>(index);

  const el = useRef<HTMLElement | null>(null);
  const dragRef = useDragHook<T>(node);
  const dropRef = useDropHook(el, node);
  const innerRef = useCallback(
    (n: HTMLElement | null) => {
      el.current = n;
      dropRef(n);
    },
    [dropRef],
  );

  useEffect(() => {
    if (!node.isEditing && node.isFocused) {
      el.current?.focus({ preventScroll: true });
    }
  }, [node.isEditing, node.isFocused]);

  return <RowView style={style} node={node} dragRef={dragRef} innerRef={innerRef} />;
});

function RowViewInner<T>({ style, node, dragRef, innerRef }: RowViewProps<T>) {
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
  const tree = useTreeApi<T>(); // Tree already has the fresh state
  useDestinationUpdates(node.id); // Re-render when this row becomes the drop target

  const indent = tree.indent * node.level;
  const nodeStyle = useMemo(() => ({ paddingLeft: indent }), [indent]);
  const rowStyle = useMemo(
    () => ({
      ...style,
      top: parseFloat(style.top as string) + (tree.props.padding ?? tree.props.paddingTop ?? 0),
      // react-window gives the row width: 100% of the viewport. When a deeply
      // nested (or long) node overflows horizontally, that clips the row's
      // background/selection highlight at the viewport edge. min-width:
      // max-content lets the row grow with its content so the highlight spans
      // the full scrollable width (#10).
      minWidth: "max-content",
    }),
    [style, tree.props.padding, tree.props.paddingTop],
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

  const Node = tree.renderNode;
  const Row = tree.renderRow;

  return (
    <Row node={node} innerRef={innerRef} attrs={rowAttrs}>
      <Node node={node} tree={tree} style={nodeStyle} dragHandle={dragRef} />
    </Row>
  );
}

const RowView = React.memo(RowViewInner) as typeof RowViewInner;
