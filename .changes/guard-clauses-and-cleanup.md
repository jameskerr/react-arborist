---
type: fix
---

Deduplicate `computeDrop` branches and decouple tree keyboard navigation into modular command handlers with early return guard clauses.

PageDown no longer falls through to the type-to-find handler, which used to append the literal string "PageDown" to the search term, and each tree now keeps its own type-to-find buffer instead of sharing one module-level term across every tree on the page.

When multiple nodes at the end of the tree are deleted via Backspace, focus falls back to the nearest unselected node instead of an invalid node that is part of the deletion set.
