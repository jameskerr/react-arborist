import { useMemo, useState } from "react";
import { SimpleTree } from "../data/simple-tree";
import {
  CreateHandler,
  CrossTreeAddHandler,
  CrossTreeDeleteHandler,
  DeleteHandler,
  MoveHandler,
  RenameHandler,
} from "../types/handlers";
import { NodeApi } from "../interfaces/node-api";

export type SimpleTreeData = {
  id: string;
  name: string;
  children?: SimpleTreeData[];
};

let nextId = 0;

export function useSimpleTree<T>(initialData: readonly T[]) {
  const [data, setData] = useState(initialData);
  const tree = useMemo(
    () =>
      new SimpleTree<// @ts-ignore
      T>(data),
    [data]
  );

  const onMove: MoveHandler<T> = (args: {
    dragIds: string[];
    dragNodes?: T[];
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

  const onCreate: CreateHandler<T> = ({ parentId, index, type }) => {
    const data = { id: `simple-tree-id-${nextId++}`, name: "" } as any;
    if (type === "internal") data.children = [];
    tree.create({ parentId, index, data });
    setData(tree.data);
    return data;
  };

  const onDelete: DeleteHandler<T> = (args: { ids: string[] }) => {
    args.ids.forEach((id) => tree.drop({ id }));
    setData(tree.data);
  };

  const onCrossTreeDelete: CrossTreeDeleteHandler<T> = (args: { ids: string[] }) => {
    args.ids.forEach((id) => tree.drop({ id }));
    setData(tree.data);
  }

  const onCrossTreeAdd: CrossTreeAddHandler<T> = (args: { ids: string[], parentId: string | null, index: number, dragNodes: T[] }) => {

    const findNodeById =  (tree:any, id:string) => {
      return tree.find((node: { id: string; children: any; }) => node.id === id || (node.children && findNodeById(node.children, id)));
    }

    const newNodes:T[] = [];
    for (const node of args.dragNodes) {
      newNodes.push(node);
    }

    const treeData = [...tree.data];
    if(args.parentId !== null) {
      const foundNode = findNodeById(treeData, args.parentId);
      foundNode.children.splice(args.index, 0, ...newNodes);
    } else {
      treeData.splice(args.index, 0, ...newNodes);
    }

    setData(treeData);
  }

  const controller = { onMove, onRename, onCreate, onDelete, onCrossTreeAdd, onCrossTreeDelete };

  return [data, controller] as const;
}
