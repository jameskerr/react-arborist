import { BoolFunc } from "./utils";
import * as handlers from "./handlers";
import * as renderers from "./renderers";
import { ElementType, MouseEventHandler } from "react";
import { ListOnScrollProps, CommonProps as ReactWindowCommonProps } from "react-window";
import { NodeApi } from "../interfaces/node-api";
import { OpenMap } from "../state/open-slice";
import { useDragDropManager, DndProviderProps } from "react-dnd";

/** Returns the height in pixels for a given node's row. */
export type RowHeightAccessor<T> = (node: NodeApi<T>) => number;

export interface TreeProps<T> {
  /* Data Options */
  data?: readonly T[];
  initialData?: readonly T[];

  /* Data Handlers */
  onCreate?: handlers.CreateHandler<T>;
  onMove?: handlers.MoveHandler<T>;
  onRename?: handlers.RenameHandler<T>;
  onDelete?: handlers.DeleteHandler<T>;

  /* Renderers*/
  children?: ElementType<renderers.NodeRendererProps<T>>;
  renderRow?: ElementType<renderers.RowRendererProps<T>>;
  renderDragPreview?: ElementType<renderers.DragPreviewProps>;
  renderCursor?: ElementType<renderers.CursorProps>;
  renderContainer?: ElementType<{}>;

  /* Sizes */
  rowHeight?: number | RowHeightAccessor<T>;
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
  disableSelect?: string | boolean | BoolFunc<T>;
  disableEdit?: string | boolean | BoolFunc<T>;
  disableDrag?: string | boolean | BoolFunc<T>;
  disableDrop?:
    | string
    | boolean
    | ((args: { parentNode: NodeApi<T>; dragNodes: NodeApi<T>[]; index: number }) => boolean);

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
  dndBackend?: Extract<DndProviderProps<unknown, unknown>, { backend: unknown }>["backend"];
  dndManager?: ReturnType<typeof useDragDropManager>;

  /* The react-dnd item type each row's drag source advertises. Defaults to
     "NODE". Set a custom value (or a per-node function) so rows can be dropped
     onto external react-dnd targets that accept that type. The dragged node's
     data is always exposed on the drag item, so an external target accepting
     the default "NODE" type can read it without setting this. Note: the tree's
     own drop targets only accept "NODE", so a row given a custom type is no
     longer reorderable within the tree. */
  dragType?: string | ((node: NodeApi<T>) => string);

  /* Custom react-window outer/inner elements */
  outerElementType?: ReactWindowCommonProps["outerElementType"];
  innerElementType?: ReactWindowCommonProps["innerElementType"];
}
