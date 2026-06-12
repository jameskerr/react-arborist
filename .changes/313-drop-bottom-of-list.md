---
type: fix
pr: 361
credit: 313
---
Dropping a dragged node in the empty area below the last row fires `onMove`
again. The drop logic had been moved into the per-row drop hook but never added
to the outer (bottom-of-list) drop target, so drops to the very bottom of the
tree were silently ignored. The shared handler now lives on `tree.drop()` and is
used by both drop targets.
