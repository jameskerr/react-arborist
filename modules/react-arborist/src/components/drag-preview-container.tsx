import { useDragPreviewState, useTreeApi } from "../context.js";
import { DefaultDragPreview } from "./default-drag-preview.js";

export function DragPreviewContainer() {
  const tree = useTreeApi();
  const state = useDragPreviewState();

  const DragPreview = tree.props.renderDragPreview || DefaultDragPreview;
  return (
    <DragPreview
      offset={state.offset}
      mouse={state.mouse}
      id={state.id}
      dragIds={state.dragIds}
      isDragging={state.isDragging}
    />
  );
}
