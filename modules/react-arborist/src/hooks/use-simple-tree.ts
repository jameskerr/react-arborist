import { useMemo, useState } from "react";
import { SimpleTree, SimpleTreeOptions } from "../data/simple-tree";
import { CreateHandler, DeleteHandler, MoveHandler, RenameHandler } from "../types/handlers";

export type SimpleTreeData = {
  id: string;
  name: string;
  children?: SimpleTreeData[];
};

let nextId = 0;

export function useSimpleTree<T>(initialData: readonly T[], options: SimpleTreeOptions<T> = {}) {
  const [data, setData] = useState(initialData);
  const idAccessor = options.idAccessor;
  const childrenAccessor = options.childrenAccessor;
  const tree = useMemo(
    () => new SimpleTree<T>(data as T[], { idAccessor, childrenAccessor }),
    [data, idAccessor, childrenAccessor],
  );

  const onMove: MoveHandler<T> = (args: {
    dragIds: string[];
    parentId: null | string;
    index: number;
  }) => {
    for (const id of args.dragIds) {
      tree.move({ id, parentId: args.parentId, index: args.index });
    }
    setData(tree.data);
  };

  const onRename: RenameHandler<T> = ({ name, id }) => {
    tree.update({ id, changes: { name } as any });
    setData(tree.data);
  };

  // New nodes must carry their id/children under the same keys the accessors
  // read, or the controller (and the tree's own accessId) can't find them
  // afterward (issue #73). A function accessor can't be inverted to a writable
  // key, so node creation with one isn't supportable — fail fast instead of
  // returning a node that throws deeper in the tree.
  const idKey = typeof idAccessor === "string" ? idAccessor : "id";
  const childrenKey = typeof childrenAccessor === "string" ? childrenAccessor : "children";

  const onCreate: CreateHandler<T> = ({ parentId, index, type }) => {
    if (typeof idAccessor === "function") {
      throw new Error(
        `React Arborist => initialData can't create nodes when idAccessor is a function: the generated id can't be written under a key the accessor reads. Use a string idAccessor, or the controlled \`data\` prop with your own onCreate.`,
      );
    }
    if (type === "internal" && typeof childrenAccessor === "function") {
      throw new Error(
        `React Arborist => initialData can't create folder nodes when childrenAccessor is a function: the new children array can't be written under a key the accessor reads. Use a string childrenAccessor, or the controlled \`data\` prop with your own onCreate.`,
      );
    }
    const data = { [idKey]: `simple-tree-id-${nextId++}`, name: "" } as any;
    if (type === "internal") data[childrenKey] = [];
    tree.create({ parentId, index, data });
    setData(tree.data);
    return data;
  };

  const onDelete: DeleteHandler<T> = (args: { ids: string[] }) => {
    args.ids.forEach((id) => tree.drop({ id }));
    setData(tree.data);
  };

  const controller = { onMove, onRename, onCreate, onDelete };

  return [data, controller] as const;
}
