import { HTML5Backend } from "react-dnd-html5-backend";
import { TreeProps } from "../types/tree-props.js";

type DndProviderProps =
  | { manager: NonNullable<TreeProps<unknown>["dndManager"]> }
  | {
      backend: NonNullable<TreeProps<unknown>["dndBackend"]> | typeof HTML5Backend;
      options: { rootElement: globalThis.Node | undefined };
    };

/** Resolves the props to spread onto react-dnd's <DndProvider>. */
export function getDndProviderProps<T>(
  treeProps: TreeProps<T>,
  dndRootElement: globalThis.Node | undefined,
): DndProviderProps {
  if (treeProps.dndManager) return { manager: treeProps.dndManager };
  return {
    backend: treeProps.dndBackend || HTML5Backend,
    options: { rootElement: dndRootElement },
  };
}
