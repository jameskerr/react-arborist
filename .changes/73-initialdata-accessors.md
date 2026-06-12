---
type: fix
pr: 365
---
`initialData` now honors `idAccessor` and `childrenAccessor` (issue #73, also
#170). The built-in data controller behind `initialData` hardcoded `id` and
`children`, so trees keyed differently couldn't be reordered (drag ids never
matched) and moving a node with children dropped them. The controller now reads
ids and children through the same accessors as the rest of the tree. A string
`childrenAccessor` is fully supported for reorder/create/delete; a function
`childrenAccessor` is read-only, so write-back falls back to the `children` key.
