# Version 3.15.1

**Fixes**

- Fixed the drag destination (`willReceiveDrop`, `dragDestinationParent`) reporting
a parent the cursor forbids. The hover handlers recorded a destination on every
hover — even where `canDrop()` was false — so dragging a folder toward its own
subtree left the reported parent pointing at that folder while the cursor said
"no drop." The consumer-facing destination and the cursor are now both gated on
`canDrop()` and stay consistent; releasing over an invalid spot is still rejected
rather than falling back to a root drop (the parentId half of issue #247). (#382)

# Version 3.15.0

**Features**

- Added an `adjustMoveIndex` helper for custom `onMove` handlers. `onMove`'s
`index` is a pre-removal slot (it counts the destination rows as displayed,
with the dragged rows still in place), which trips up handlers that splice the
dragged rows out before inserting them — dragging a row just below itself would
jump it past its neighbor. `adjustMoveIndex({ index, dragIds, siblingIds })`
returns the index to insert at after removal. `SimpleTree`/`useSimpleTree` are
unaffected; they already insert before removing (issue #247). (#381)

# Version 3.14.0

**Features**

- Dragging into the gap between an open folder and its first child now supports a
horizontal slide, matching how items and closed folders already behave. Sliding
right still drops the node as the folder's first child (the previous behavior);
sliding left drops it as a sibling — or grandsibling — of the folder, bounded by
the folder's ancestor chain. `computeDrop` previously hard-coded this gap to
"first child," so the level was pinned and the slide never engaged (issue #330). (#378)

# Version 3.13.2

**Fixes**

- Inputs rendered inside the tree (e.g. an `<input>` in a modal) can now receive
Space characters again. The tree's keyboard handler no longer intercepts
keystrokes that originate from a nested form field or contenteditable element. (#377)

# Version 3.13.1

**Fixes**

- `NodeApi` action methods (`toggle`, `select`, `activate`, `focus`, `edit`, etc.)
are now bound to the node, so passing them as callbacks — e.g.
`<Toggle onClick={node.toggle} />` — no longer throws "Cannot read properties of
undefined (reading 'tree')" when invoked detached. (#374)

# Version 3.13.0

**Features**

- `useSimpleTree` now accepts an `onChange` option, called with the full data
array after any internal move/create/rename/delete — a single place to persist
the whole tree without wiring up each handler yourself. (#373)

# Version 3.12.0

**Features**

- Added a `disableDeselectOnClick` prop. By default, clicking the empty area
below the rows clears the selection; setting this prop keeps the current
selection intact instead (#245, #308). (#369)

# Version 3.11.0

**Features**

- `TreeApi` now exposes `scrollToOffset(offset)` to scroll the list to an exact
pixel offset from the top, and a `scrollOffset` getter to read the current
position — the offset-based counterpart to `scrollTo(id)`, useful for saving
and restoring scroll position (#194). (#368)

# Version 3.10.6

**Fixes**

- `scrollTo` (and the `selection` prop / `tree.scrollTo()` paths that use it) now
scrolls horizontally as well as vertically, bringing a deeply nested node's
indented content into view when rows overflow the tree's width. Previously only
the vertical position was adjusted, leaving deep nodes off-screen to the right. (#367)

# Version 3.10.5

**Fixes**

- `TreeApi` methods (`select`, `focus`, `delete`, `edit`, node creation, etc.) now
honor a custom `idAccessor` when given raw row data, instead of always reading
`.id`. The identifier parameters and the `onCreate` return type accept your data
type, so a custom accessor works end-to-end. (#366)

# Version 3.10.4

**Fixes**

- `initialData` now honors `idAccessor` and `childrenAccessor` (issue #73, also
#170). The built-in data controller behind `initialData` hardcoded `id` and
`children`, so trees keyed differently couldn't be reordered (drag ids never
matched) and moving a node with children dropped them. The controller now reads
ids and children through the same accessors as the rest of the tree. A string
`childrenAccessor` is fully supported for reorder/create/delete; a function
`childrenAccessor` is read-only, so write-back falls back to the `children` key. (#365)

# Version 3.10.3

**Fixes**

- A node can no longer be dragged while it's being renamed (issue #195).
Previously, dragging inside the rename input picked the row up and moved it —
visible even in the official Gmail demo. The drag source now refuses to start a
drag while the node is in editing state, matching the VS Code explorer. (#364)

# Version 3.10.2

**Fixes**

- Dropping a dragged node in the empty area below the last row fires `onMove`
again (issue #313). The drop logic had been moved into the per-row drop hook but
never added to the outer (bottom-of-list) drop target, so drops to the very
bottom of the tree were silently ignored. The shared handler now lives on
`tree.drop()` and is used by both drop targets. (#361)

# Version 3.10.1

**Fixes**

- `selectAll()` and `deselectAll()` no longer fire `onSelect` twice. They go through `setSelection()`, which already invokes the callback, so consumers now see a single `onSelect` per Cmd+A or clear-selection action. (#357)
- A row's background and selection highlight now span the full scrollable width instead of stopping at the viewport edge. Previously a deeply nested or long node that overflowed horizontally would clip the highlight (issue #10); `min-width: max-content` is now applied to each row. (#358)

# Version 3.10.0

**Features**

- `aria-label` and `aria-labelledby` props on `Tree` are now forwarded onto the internal `role="tree"` element, giving the tree an accessible name per the W3C Treeview pattern. The element also gains `aria-multiselectable` unless `disableMultiSelection` is set (#325)

**Fixes**

- Mouse multi-selection now responds to Ctrl+Click and Ctrl+A on Windows/Linux, in addition to the existing Cmd (Meta) shortcuts on macOS (#303)

# Version 3.9.0

**Features**

- Tree nodes can now be dragged onto react-dnd drop targets outside the tree. The drag item carries the dragged node's `data`, so an external target accepting the default `"NODE"` type can read it (the tree and the target must share one backend via the `dndManager` prop). A new `dragType` prop on `Tree` (a string or `(node) => string`) lets rows advertise a custom react-dnd item type (#282, also addresses #209/#210)

# Version 3.8.0

**Features**

- `rowHeight` prop on `Tree` now accepts a function `(node) => number` in addition to a fixed number, so each row can be sized from its node. Fixed-height trees keep using react-window's `FixedSizeList`; the function form uses `VariableSizeList`. Adds a `tree.redrawList()` API method to recompute row offsets when a `rowHeight` function's output changes for reasons the tree can't observe (#341, originally #238)

# Version 3.7.0

**Features**

- `outerElementType` and `innerElementType` props on `Tree` for supplying custom react-window wrappers; `DropContainer`, `ListOuterElement`, and `ListInnerElement` are now exported so custom outers can compose the existing drop-target behavior (#339, originally #318)

# Version 3.6.1

**Fixes**

- Imperative `tree.update()` props no longer get reverted when a node is toggled (#337, originally #229)

# Version 3.6.0

**Features**

- `disableSelect` prop on `Tree` for marking nodes as unselectable, mirroring `disableEdit` and `disableDrop` (#331)

# Version 3.5.0

**Features**

- `getTreeLinePrefix` utility for rendering tree connector lines (#324)
- `dndBackend` prop on `Tree` for supplying a custom react-dnd backend (#326, originally #316)
- `selectMulti` now accepts an options argument (`{ align, focus }`) for consistency with `select` (#266)

**Fixes**

- `dndManager` prop no longer triggers unnecessary re-renders; `backend`/`options` are only passed to `DndProvider` when no custom manager is supplied (#237)

# Version 3.0.0

**Breaking Changes**

- Tree Component `disableDrop` Prop
- NodeApi `isDroppable` property

**Features**

- Disable Edit
- Disable Drop Dynamically

**Extras**

- Indent Lines in Cities Demo
- Cypress Integration Tests
- Removed ForwardRef Redeclare

## Features

**Disable Edit**

The `disableEdit` prop was added to the tree to specify nodes that cannot be edited. This also fixed a bug when pressing the keyboard shortcut "Enter" on a node that did not render a form. The tree would get stuck in the "editing" mode and could not return to the normal mode.

**Disable Drop Dynamically**

The `disableDrop` prop now accepts a function with the arguments described below. Previously you could only provide a static list of nodes that were not droppable, but now you can determine it dynamically.

## Breaking Changes

**Tree Component `disableDrop` Prop**

If you were passing a function to the `disableDrop` prop, you'll need to update it to use the following signature:

```ts
declare function disableDrop(args: {
  dragNodes: NodeApi[]; // The nodes being dragged
  parentNode: NodeApi; // The new parent of the dragNodes if dropped
  index: number; // The new child index of the dragNodes if dropped
}): boolean;
```

This lets you disallow a drop based on the items being dragged and which node you are hovering over. You might notice it matches the function signature of the onMove handler. It is still possible to pass a string or a boolean to the `disableDrop` prop to prevent drops statically.

**NodeApi `isDroppable` property**

The `.isDroppable` property has been removed from the NodeApi class. This is now determined dynamically from the tree's state. It doesn't make sense to ask an single node if it is droppable anymore.
