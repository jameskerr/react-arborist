import { DragOverlay, useDndContext } from "@dnd-kit/core";
import { useNodesContext, useTreeApi } from "../context.js";
import { DefaultDragPreview } from "./default-drag-preview.js";

export function DragPreviewContainer() {
  const tree = useTreeApi();
  const nodes = useNodesContext();
  const { active } = useDndContext();
  /* DragOverlay only renders its children while a drag is active, so there is
     nothing to show (and no id to derive) once `active` is null. */
  if (!active) return null;
  const id = String(active.id);
  const dragIds = nodes.drag.selectedIds.length > 0 ? nodes.drag.selectedIds : [id];

  const DragPreview = tree.props.renderDragPreview || DefaultDragPreview;
  return (
    <DragOverlay dropAnimation={null}>
      <DragPreview id={id} dragIds={dragIds} isDragging={true} />
    </DragOverlay>
  );
}
