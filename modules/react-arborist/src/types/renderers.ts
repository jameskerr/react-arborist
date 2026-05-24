import { CSSProperties, HTMLAttributes, ReactElement } from "react";
import { NodeApi } from "../interfaces/node-api";
import { TreeApi } from "../interfaces/tree-api";
import { XYCoord } from "react-dnd";

export type NodeRendererProps<T> = {
  style: CSSProperties;
  node: NodeApi<T>;
  tree: TreeApi<T>;
  dragHandle?: (el: HTMLDivElement | null) => void;
  preview?: boolean;
};

export type RowRendererProps<T> = {
  node: NodeApi<T>;
  innerRef: (el: HTMLDivElement | null) => void;
  attrs: HTMLAttributes<any>;
  children: ReactElement;
};

export type DragPreviewProps = {
  offset: XYCoord | null;
  mouse: XYCoord | null;
  id: string | null;
  dragIds: string[];
  isDragging: boolean;
};

export type CursorProps = {
  top: number;
  left: number;
  indent: number;
};
