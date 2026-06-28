---
type: feature
pr: 368
---
`TreeApi` now exposes `scrollToOffset(offset)` to scroll the list to an exact
pixel offset from the top, and a `scrollOffset` getter to read the current
position — the offset-based counterpart to `scrollTo(id)`, useful for saving
and restoring scroll position (#194).
