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
