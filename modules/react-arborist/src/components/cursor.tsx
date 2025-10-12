import { useDndContext, useTreeApi } from "../context";

export function Cursor() {
  const tree = useTreeApi();
  const state = useDndContext();
  const cursor = state.cursor;
  if (!cursor || cursor.type !== "line") return null;
  const indent = tree.indent;
  const top =
    tree.rowHeight * cursor.index +
    tree.paddingTop;
  const left = indent * cursor.level + tree.paddingLeft;
  const Cursor = tree.renderCursor;
  return <Cursor {...{ top, left, indent }} />;
}
