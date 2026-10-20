---
type: breaking
---
Migrate drag-and-drop backend from `react-dnd` to `@dnd-kit`. `react-dnd` and `react-dnd-html5-backend` are no longer needed and have been removed from `peerDependencies`. Drag and drop now uses `@dnd-kit/core` and `@dnd-kit/utilities` out of the box with native Pointer and Keyboard sensor support, eliminating the global HTML5 backend singleton conflict (#319). Consumer row renderers using `ref={dragHandle}` and `renderDragPreview` continue to work without code changes, and `XYCoord` is now defined locally. Added a `sensors` prop to `<Tree>` to customize `@dnd-kit` sensor activation constraints, and exported `treeCollisionDetection` for coordinating with parent `<DndContext>` wrappers. The legacy `dndBackend` and `dndManager` props are now deprecated. (Part of #390)
