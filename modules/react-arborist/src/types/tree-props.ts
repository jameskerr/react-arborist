import { BoolFunc } from "./utils";
import * as handlers from "./handlers";
import * as renderers from "./renderers";
import { ElementType, MouseEventHandler } from "react";
import { ListOnScrollProps } from "react-window";
import { NodeApi } from "../interfaces/node-api";
import { OpenMap } from "../state/open-slice";
import { useDragDropManager } from "react-dnd";
import { TreeApi } from "../interfaces/tree-api";
import { DropResult } from "../dnd/drop-hook";

export interface TreeProps<T> {
  id?: string;
  allowCrossTreeDrop?: boolean;
  allowCrossTreeDrag?: boolean;
  /* Data Options */
  data?: readonly T[];
  initialData?: readonly T[];

  /* Data Handlers */
  onCreate?: handlers.CreateHandler<T>;
  onMove?: handlers.MoveHandler<T>;
  onRename?: handlers.RenameHandler<T>;
  onDelete?: handlers.DeleteHandler<T>;
  onCrossTreeAdd?: handlers.CrossTreeAddHandler<T>;
  onCrossTreeDelete?: handlers.CrossTreeDeleteHandler<T>;

  /* Renderers*/
  children?: ElementType<renderers.NodeRendererProps<T>>;
  renderRow?: ElementType<renderers.RowRendererProps<T>>;
  renderDragPreview?: ElementType<renderers.DragPreviewProps>;
  renderCursor?: ElementType<renderers.CursorProps>;
  renderContainer?: ElementType<{}>;

  /* Sizes */
  rowHeight?: number;
  overscanCount?: number;
  width?: number | string;
  height?: number;
  indent?: number;
  paddingTop?: number;
  paddingBottom?: number;
  padding?: number;

  /* Config */
  childrenAccessor?: string | ((d: T) => readonly T[] | null);
  idAccessor?: string | ((d: T) => string);
  openByDefault?: boolean;
  selectionFollowsFocus?: boolean;
  disableMultiSelection?: boolean;
  disableEdit?: string | boolean | BoolFunc<T>;
  disableDrag?: string | boolean | BoolFunc<T>;
  disableDrop?: DisableDrop<T>;

  /* Event Handlers */
  onActivate?: (node: NodeApi<T>) => void;
  onSelect?: (nodes: NodeApi<T>[]) => void;
  onScroll?: (props: ListOnScrollProps) => void;
  onToggle?: (id: string) => void;
  onFocus?: (node: NodeApi<T>) => void;

  /* Selection */
  selection?: string;

  /* Open State */
  initialOpenState?: OpenMap;

  /* Search */
  searchTerm?: string;
  searchMatch?: (node: NodeApi<T>, searchTerm: string) => boolean;

  /* Extra */
  className?: string | undefined;
  rowClassName?: string | undefined;

  dndRootElement?: globalThis.Node | null;
  onClick?: MouseEventHandler;
  onContextMenu?: MouseEventHandler;
  dndManager?: ReturnType<typeof useDragDropManager>;
}

export interface DisableDropArgs<T> {
  parentNode: NodeApi<T>;
  dragNodes: NodeApi<T>[];
  index: number;
  sourceTree: TreeApi<unknown>;
  sourceTreeId?: string;
  drop: DropResult | null;
  targetTreeId?: string;
}

export type DisableDrop<T> =
  | string
  | boolean
  | ((args: DisableDropArgs<T>) => boolean);