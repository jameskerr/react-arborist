---
type: breaking
---

Drag previews are now rendered by `@dnd-kit/core`'s `<DragOverlay>` instead of a hand-positioned
fixed layer, so a drag follows the pointer without the library computing preview coordinates on
every move. `DragPreviewProps` loses `offset` and `mouse`, which are no longer passed now that the
overlay positions the preview; a custom `renderDragPreview` that positioned itself with `offset`
should drop that positioning. `id` and `dragIds` are unchanged; `isDragging` is still passed, but
the preview now mounts only during an active drag and always receives `true`, so a preview that
previously animated out on `isDragging === false` will not see that render.
