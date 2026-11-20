---
type: fix
---

Selection add and remove copy the selection `Set` instead of mutating the previous one, so an earlier `selectedIds` snapshot stays unchanged after the next select or deselect.
