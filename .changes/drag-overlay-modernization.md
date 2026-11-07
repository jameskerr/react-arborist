---
type: breaking
---

Drag previews are now rendered by `@dnd-kit/core`'s `<DragOverlay>` instead of a hand-positioned
fixed layer, so a drag follows the pointer without the library computing preview coordinates on
every move. `DragPreviewProps` loses `offset` and `mouse`, which are always `null` now that the
overlay positions the preview; a custom `renderDragPreview` that positioned itself with `offset`
should drop that positioning. `id`, `dragIds` and `isDragging` are unchanged.
