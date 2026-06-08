---
type: fix
pr: 358
---
A row's background and selection highlight now span the full scrollable width
instead of stopping at the viewport edge. Previously a deeply nested or long
node that overflowed horizontally would clip the highlight (issue #10);
`min-width: max-content` is now applied to each row.
