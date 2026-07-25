---
type: fix
---
The default `searchMatch` no longer searches a node's children. It previously
stringified every value of the node's data, the `children` array included, so
each ancestor of a match counted as a match itself, and terms like `id` or
`name` matched every folder by hitting keys nested in the children data. The filtered list is unchanged — parents of a match
are still shown to keep the tree's structure — but `tree.filteredCount` now
reports real matches.
