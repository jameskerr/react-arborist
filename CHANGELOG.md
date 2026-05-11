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
