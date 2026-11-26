---
type: fix
---
`tree.scrollTo()` no longer keeps polling every 10 ms for the life of the page when the id never appears in the tree; it stops once it gives up (issue #403).
