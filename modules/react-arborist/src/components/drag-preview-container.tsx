import { useDragLayer } from "react-dnd";
import { useTreeApi } from "../context";
import { DefaultDragPreview } from "./default-drag-preview";

export function DragPreviewContainer() {
  const tree = useTreeApi();
  const { offset, mouse, item, isDragging } = useDragLayer((m) => {
    return {
      offset: m.getSourceClientOffset(),
      mouse: m.getClientOffset(),
      item: m.getItem(),
      isDragging: m.isDragging(),
    };
  });

  const DragPreview = tree.props.renderDragPreview || DefaultDragPreview;
  return (
    <DragPreview
      offset={offset}
      mouse={mouse}
      id={item?.id || null}
      dragIds={item?.dragIds || []}
      isDragging={isDragging}
    />
  );
}
