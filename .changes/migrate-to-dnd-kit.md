---
type: breaking
---
Drag and drop now runs on `@dnd-kit/core` 6.x instead of `react-dnd`. `react-dnd` and
`react-dnd-html5-backend` are no longer dependencies or peers, so the global HTML5 backend
singleton conflict is gone (#319), and each `<Tree>` owns its own `<DndContext>`. Row renderers
that use `ref={dragHandle}` and `renderDragPreview` keep working unchanged, `XYCoord` is defined
locally, and a new `sensors` prop customizes the pointer sensor's activation constraints. DnD is
now pointer-only: the default sensors no longer include `@dnd-kit`'s `KeyboardSensor`, which
would otherwise start a drag on Space or Enter and swallow the tree's own keyboard commands.

This drops capabilities that depended on `react-dnd` and native HTML5 drag and drop:

- Dragging rows onto the host app's `react-dnd` targets, and dropping the app's `react-dnd`
  items into the tree.
- OS file drops, dragging rows out to other apps or windows, and iframe setups via
  `dndRootElement`.
- `dragType` as a filter: it is now only a label on the drag data, so a custom type no longer
  makes a row non-reorderable within the tree.

`dndBackend`, `dndManager`, and `dndRootElement` are removed rather than deprecated, so
TypeScript flags existing uses. Coordinating several trees inside one shared `<DndContext>` is
no longer supported and is tracked in #396. (Part of #390)
