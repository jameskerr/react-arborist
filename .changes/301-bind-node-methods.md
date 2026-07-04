---
type: fix
pr: 374
---
`NodeApi` action methods (`toggle`, `select`, `activate`, `focus`, `edit`, etc.)
are now bound to the node, so passing them as callbacks — e.g.
`<Toggle onClick={node.toggle} />` — no longer throws "Cannot read properties of
undefined (reading 'tree')" when invoked detached.
