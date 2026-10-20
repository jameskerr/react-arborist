import { DragOverlay, useDndContext } from "@dnd-kit/core";
import { useNodesContext, useTreeApi } from "../context.js";
import { DefaultDragPreview } from "./default-drag-preview.js";

export function DragPreviewContainer() {
  const tree = useTreeApi();
  const nodes = useNodesContext();
  const { active } = useDndContext();
  const id = active ? String(active.id) : nodes.drag.id;
  const dragIds = nodes.drag.selectedIds.length > 0 ? nodes.drag.selectedIds : id ? [id] : [];
  const isDragging = Boolean(active || id);

  const DragPreview = tree.props.renderDragPreview || DefaultDragPreview;
  return (
    <DragOverlay dropAnimation={null}>
      {isDragging && id ? (
        <DragPreview offset={null} mouse={null} id={id} dragIds={dragIds} isDragging={isDragging} />
      ) : null}
    </DragOverlay>
  );
}
