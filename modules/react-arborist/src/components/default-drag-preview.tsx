import React, { memo } from "react";
import { useTreeApi } from "../context.js";
import { DragPreviewProps } from "../types/renderers.js";

export function DefaultDragPreview({ id, dragIds }: DragPreviewProps) {
  return (
    <div className="row preview" style={{ pointerEvents: "none" }}>
      <PreviewNode id={id} dragIds={dragIds} />
      <Count count={dragIds.length} />
    </div>
  );
}

function Count(props: { count: number }) {
  const { count } = props;
  if (count > 1) {
    return (
      <div
        className="selected-count"
        style={{
          position: "absolute",
          top: 4,
          right: 4,
        }}
      >
        {count}
      </div>
    );
  }
  return null;
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
