import { forwardRef } from "react";
import { TreeProvider } from "./provider.js";
import { TreeApi } from "../interfaces/tree-api.js";
import { OuterDrop } from "./outer-drop.js";
import { TreeContainer } from "./tree-container.js";
import { DragPreviewContainer } from "./drag-preview-container.js";
import { TreeProps } from "../types/tree-props.js";
import { useValidatedProps } from "../hooks/use-validated-props.js";

function TreeComponent<T>(props: TreeProps<T>, ref: React.Ref<TreeApi<T> | undefined>) {
  const treeProps = useValidatedProps(props);
  return (
    <TreeProvider treeProps={treeProps} imperativeHandle={ref}>
      <OuterDrop>
        <TreeContainer />
      </OuterDrop>
      <DragPreviewContainer />
    </TreeProvider>
  );
}

export const Tree = forwardRef(TreeComponent) as <T>(
  props: TreeProps<T> & { ref?: React.ForwardedRef<TreeApi<T> | undefined> },
) => ReturnType<typeof TreeComponent>;
