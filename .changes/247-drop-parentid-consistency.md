---
type: fix
---
Fixed the drag destination (`willReceiveDrop`, `dragDestinationParent`) reporting
a parent the cursor forbids. The hover handlers recorded a destination on every
hover — even where `canDrop()` was false — so dragging a folder toward its own
subtree left the reported parent pointing at that folder while the cursor said
"no drop." The consumer-facing destination and the cursor are now both gated on
`canDrop()` and stay consistent; releasing over an invalid spot is still rejected
rather than falling back to a root drop (the parentId half of issue #247).
