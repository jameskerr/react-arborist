---
type: feature
pr: 373
---
`useSimpleTree` now accepts an `onChange` option, called with the full data
array after any internal move/create/rename/delete — a single place to persist
the whole tree without wiring up each handler yourself.
