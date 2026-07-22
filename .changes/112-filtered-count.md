---
type: feature
---
Added a `filteredCount` getter to the tree API, reporting how many nodes match
the current `searchTerm` across the whole tree (regardless of which folders are
open), or 0 when there is no active search. Consumers can now render a match
count or a "no results" message via `isFiltered && filteredCount === 0` instead
of inspecting `visibleNodes` (issues #112 and #256).
