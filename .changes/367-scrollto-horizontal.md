---
type: fix
pr: 367
---
`scrollTo` (and the `selection` prop / `tree.scrollTo()` paths that use it) now
scrolls horizontally as well as vertically, bringing a deeply nested node's
indented content into view when rows overflow the tree's width. Previously only
the vertical position was adjusted, leaving deep nodes off-screen to the right.
