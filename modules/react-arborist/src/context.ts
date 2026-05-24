import React, { createContext, useContext } from "react";
import { TreeApi } from "./interfaces/tree-api";
import { RootState } from "./state/root-reducer";

export const TreeApiContext = createContext<TreeApi<any> | null>(null);

export function useTreeApi<T>() {
  const value = useContext<TreeApi<T> | null>(
    TreeApiContext as unknown as React.Context<TreeApi<T> | null>,
  );
  if (value === null) throw new Error("No Tree Api Provided");
  return value;
}

export const NodesContext = createContext<RootState["nodes"] | null>(null);

export function useNodesContext() {
  const value = useContext(NodesContext);
  if (value === null) throw new Error("Provide a NodesContext");
  return value;
}

export const DndContext = createContext<RootState["dnd"] | null>(null);

export function useDndContext() {
  const value = useContext(DndContext);
  if (value === null) throw new Error("Provide a DnDContext");
  return value;
}

export const DataUpdatesContext = createContext<number>(0);

export function useDataUpdates() {
  useContext(DataUpdatesContext);
}
