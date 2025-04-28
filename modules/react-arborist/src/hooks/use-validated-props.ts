import { TreeProps } from "../types/tree-props";
import { IdObj } from "../types/utils";
import { SimpleTreeData, useSimpleTree } from "./use-simple-tree";

export function useValidatedProps<T>(props: TreeProps<T>): TreeProps<T> {
  if (props.initialData && props.data) {
    throw new Error(
      `React Arborist Tree => Provide either a data or initialData prop, but not both.`
    );
  }
  if (
    props.initialData &&
    (props.onCreate || props.onDelete || props.onMove || props.onRename || props.onCrossTreeAdd || props.onCrossTreeDelete)
  ) {
    throw new Error(
      `React Arborist Tree => You passed the initialData prop along with a data handler.
Use the data prop if you want to provide your own handlers.`
    );
  }
  if (props.initialData) {
    /**
     * Let's break the rules of hooks here. If the initialData prop
     * is provided, we will assume it will not change for the life of
     * the component.
     *
     * We will provide the real data and the handlers to update it.
     *   */
    const [data, controller] = useSimpleTree<T>(props.initialData);
    return { ...props, ...controller, data };
  } else {
    return props;
  }
}
