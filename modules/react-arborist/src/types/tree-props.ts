import { BoolFunc } from "./utils.js";
import * as handlers from "./handlers.js";
import * as renderers from "./renderers.js";
import { ElementType, MouseEventHandler } from "react";
import { ListOnScrollProps, CommonProps as ReactWindowCommonProps } from "react-window";
import { NodeApi } from "../interfaces/node-api.js";
import { OpenMap } from "../state/open-slice.js";
import type { SensorDescriptor, SensorOptions } from "@dnd-kit/core";

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
  disableDeselectOnClick?: boolean;
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

  /* Accessibility */
  "aria-label"?: string;
  "aria-labelledby"?: string;

  /* Extra */
  className?: string | undefined;
  rowClassName?: string | undefined;

  onClick?: MouseEventHandler;
  onContextMenu?: MouseEventHandler;
  /** Custom sensors for @dnd-kit DndContext. Defaults to PointerSensor. */
  sensors?: SensorDescriptor<SensorOptions>[];

  /* The item type each row's drag source advertises on its draggable data.
     Defaults to "NODE". Set a custom value (or a per-node function) so rows can be
     dropped onto external drop targets that accept that type. */
  dragType?: string | ((node: NodeApi<T>) => string);

  /* Custom react-window outer/inner elements */
  outerElementType?: ReactWindowCommonProps["outerElementType"];
  innerElementType?: ReactWindowCommonProps["innerElementType"];
}
