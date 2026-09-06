---
type: feature
---
The `height` prop now accepts a CSS value or `"auto"` in addition to a number of
pixels, so a tree can size itself. A CSS value (`"100%"`, `"50vh"`,
`"calc(100% - 2rem)"`) is applied to the tree element and the resolved height is
measured with a `ResizeObserver` and handed to the virtualized list, which is
what filling a parent used to require a resize observer in userland for.
`"auto"` grows the tree to fit its rows. A new `maxHeight` prop, taking pixels or
a CSS value, caps that growth — `height="auto" maxHeight="100%"` is as tall as
the rows or the parent, whichever is shorter — and keeps the list virtualized.
Trees given a numeric `height` measure nothing and behave exactly as before
(issue #86).
