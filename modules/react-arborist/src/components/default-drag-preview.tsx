import React, { CSSProperties, memo } from "react";
import { XYCoord } from "react-dnd";
import { useTreeApi } from "../context";
import { DragPreviewProps } from "../types/renderers";

const layerStyles: CSSProperties = {
  position: "fixed",
  pointerEvents: "none",
  zIndex: 100,
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
};

const getStyle = (offset: XYCoord | null) => {
  if (!offset) return { display: "none" };
  const { x, y } = offset;
  return { transform: `translate(${x}px, ${y}px)` };
};

const getCountStyle = (offset: XYCoord | null) => {
  if (!offset) return { display: "none" };
  const { x, y } = offset;
  return { transform: `translate(${x + 10}px, ${y + 10}px)` };
};

export function DefaultDragPreview({ offset, mouse, id, dragIds, isDragging }: DragPreviewProps) {
  return (
    <Overlay isDragging={isDragging}>
      <Position offset={offset}>
        <PreviewNode id={id} dragIds={dragIds} />
      </Position>
      <Count mouse={mouse} count={dragIds.length} />
    </Overlay>
  );
}

const Overlay = memo(function Overlay(props: { children: JSX.Element[]; isDragging: boolean }) {
  if (!props.isDragging) return null;
  return <div style={layerStyles}>{props.children}</div>;
});

function Position(props: { children: JSX.Element; offset: XYCoord | null }) {
  return (
    <div className="row preview" style={getStyle(props.offset)}>
      {props.children}
    </div>
  );
}

function Count(props: { count: number; mouse: XYCoord | null }) {
  const { count, mouse } = props;
  if (count > 1)
    return (
      <div className="selected-count" style={getCountStyle(mouse)}>
        {count}
      </div>
    );
  else return null;
}

const PreviewNode = memo(function PreviewNode<T>(props: { id: string | null; dragIds: string[] }) {
  const tree = useTreeApi<T>();
  const node = tree.get(props.id);
  if (!node) return null;
  return (
    <tree.renderNode
      preview
      node={node}
      style={{
        paddingLeft: node.level * tree.indent,
        opacity: 0.2,
        background: "transparent",
      }}
      tree={tree}
    />
  );
});
