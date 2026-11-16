---
type: fix
---
`tree.scrollTo()`, `tree.indexOf()` and `tree.idToIndex` no longer treat ids such as `toString` or `constructor` as present in the tree when no node has that id.
