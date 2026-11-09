---
type: fix
---

Keyboard shortcuts no longer corrupt type-to-find: PageDown used to fall through and append the literal string "PageDown" to the search term, and other non-character keys and modifier shortcuts are now ignored as well. AltGr and macOS Option-composed letters still reach the search. Each tree also keeps its own search term instead of sharing one term across every tree on the page.

`A` without an `onCreate` handler now runs type-to-find instead of doing nothing, matching what a plain character does.

With multiple nodes selected, Backspace moves focus to the nearest visible row that survives the deletion, including skipping rows that are inside a selected folder and so are deleted with it. With a single node selected, Backspace now focuses the previous visible row instead of the root when there is no next sibling.

Internally, the keyboard commands moved into one table of small handlers, so the tree's keydown branch is no longer 200 lines long, and the duplicated `computeDrop` branches are merged.
