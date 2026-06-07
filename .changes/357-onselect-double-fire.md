---
type: fix
pr: 357
---
`selectAll()` and `deselectAll()` no longer fire `onSelect` twice. They go
through `setSelection()`, which already invokes the callback, so consumers now
see a single `onSelect` per Cmd-A or clear-selection action.
