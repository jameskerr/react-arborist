import { useMemo } from "react";
import { DragOverlay, useDndContext } from "@dnd-kit/core";
import { useNodesContext, useTreeApi } from "../context.js";
import { DefaultDragPreview } from "./default-drag-preview.js";

export function DragPreviewContainer() {
  const tree = useTreeApi();
  const nodes = useNodesContext();
  const { active } = useDndContext();
  const id = active ? String(active.id) : null;
  const selected = nodes.drag.selectedIds;
  const dragIds = useMemo(() => (selected.length > 0 ? selected : id ? [id] : []), [selected, id]);

  const DragPreview = tree.props.renderDragPreview || DefaultDragPreview;
  /* useDndContext() returns a new collisions array on every pointer move, so
     this component re-renders continuously during a drag. Memoising the
     element keeps the preview (and a consumer's renderDragPreview) from doing
     the same. */
  const preview = useMemo(
    () => (id ? <DragPreview id={id} dragIds={dragIds} isDragging={true} /> : null),
    [DragPreview, id, dragIds],
  );

  /* DragOverlay only renders its children while a drag is active, so there is
     nothing to show once `active` is null. */
  if (!active) return null;
  return <DragOverlay dropAnimation={null}>{preview}</DragOverlay>;
}
