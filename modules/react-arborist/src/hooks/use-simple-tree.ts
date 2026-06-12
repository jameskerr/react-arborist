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
  // read, or the controller can't find them afterward (issue #73). A function
  // accessor can't be written to, so fall back to the default key.
  const idKey = typeof idAccessor === "string" ? idAccessor : "id";
  const childrenKey = typeof childrenAccessor === "string" ? childrenAccessor : "children";

  const onCreate: CreateHandler<T> = ({ parentId, index, type }) => {
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
