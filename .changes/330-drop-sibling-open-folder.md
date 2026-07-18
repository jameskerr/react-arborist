---
type: feature
---
Dragging into the gap between an open folder and its first child now supports a
horizontal slide, matching how items and closed folders already behave. Sliding
right still drops the node as the folder's first child (the previous behavior);
sliding left drops it as a sibling — or grandsibling — of the folder, bounded by
the folder's ancestor chain. `computeDrop` previously hard-coded this gap to
"first child," so the level was pinned and the slide never engaged (issue #330).
