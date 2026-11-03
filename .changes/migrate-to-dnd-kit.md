---
type: breaking
---
Drag and drop now runs on `@dnd-kit/core` 6.x as a peer dependency instead of `react-dnd`
and `react-dnd-html5-backend`. The global HTML5 backend singleton conflict is gone (#319),
and each `<Tree>` owns its own `<DndContext>`. Row renderers that use `ref={dragHandle}` keep working unchanged, `XYCoord` is defined locally, and a new
`sensors` prop customizes the default sensor activation constraints. DnD is now pointer-only:
the default sensors no longer include `@dnd-kit`'s `KeyboardSensor`, which would otherwise start
a drag on Space or Enter and swallow the tree's own keyboard commands. Mouse drags start after a
short move, touch drags start on a press and hold so a swipe still scrolls the list.

This drops capabilities that depended on `react-dnd` and native HTML5 drag and drop:

- Dragging rows onto the host app's `react-dnd` targets, and dropping the app's `react-dnd`
  items into the tree.
- OS file drops, dragging rows out to other apps or windows, and iframe setups via
  `dndRootElement`.
- `dragType`, which only mattered when an external drop target could read the drag data; with
  each tree owning a private `DndContext` it had no effect, so it is removed rather than kept as a
  label.

`dndBackend`, `dndManager`, and `dndRootElement` are removed rather than deprecated, so
TypeScript flags existing uses. Coordinating several trees inside one shared `<DndContext>` is
no longer supported and is tracked in #396.
