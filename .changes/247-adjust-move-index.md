---
type: feature
---
Added an `adjustMoveIndex` helper for custom `onMove` handlers. `onMove`'s
`index` is a pre-removal slot (it counts the destination rows as displayed,
with the dragged rows still in place), which trips up handlers that splice the
dragged rows out before inserting them — dragging a row just below itself would
jump it past its neighbor. `adjustMoveIndex({ index, dragIds, siblingIds })`
returns the index to insert at after removal. `SimpleTree`/`useSimpleTree` are
unaffected; they already insert before removing (issue #247).
