---
type: fix
pr: 364
---
A node can no longer be dragged while it's being renamed (issue #195).
Previously, dragging inside the rename input picked the row up and moved it —
visible even in the official Gmail demo. The drag source now refuses to start a
drag while the node is in editing state, matching the VS Code explorer.
