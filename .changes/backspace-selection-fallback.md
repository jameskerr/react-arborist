---
type: fix
---

Fix focus fallback on Backspace deletion when multi-selection spans to the end of the tree. Previously, the fallback logic checked `tree.lastNode` without verifying if it was also selected, focusing a node that was immediately deleted. Focus now advances to the nearest unselected node preceding the deleted selection.
