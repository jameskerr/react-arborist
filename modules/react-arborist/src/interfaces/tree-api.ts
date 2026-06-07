import { EditResult } from "../types/handlers";
import { BoolFunc, Identity, IdObj } from "../types/utils";
import { TreeProps } from "../types/tree-props";
import { MutableRefObject } from "react";
import { Align, FixedSizeList, ListOnItemsRenderedProps, VariableSizeList } from "react-window";
import * as utils from "../utils";
import { DefaultCursor } from "../components/default-cursor";
import { DefaultRow } from "../components/default-row";
import { DefaultNode } from "../components/default-node";
import { NodeApi } from "./node-api";
import { edit } from "../state/edit-slice";
import { Actions, RootState } from "../state/root-reducer";
import { focus, treeBlur } from "../state/focus-slice";
import { createRoot, ROOT_ID } from "../data/create-root";
import { actions as visibility } from "../state/open-slice";
import { actions as selection } from "../state/selection-slice";
import { actions as dnd } from "../state/dnd-slice";
import { DefaultDragPreview } from "../components/default-drag-preview";
import { DefaultContainer } from "../components/default-container";
import { Cursor } from "../dnd/compute-drop";
import { Store } from "redux";
import { createList } from "../data/create-list";
import { createIndex } from "../data/create-index";

const { safeRun, identify, identifyNull } = utils;
export class TreeApi<T> {
  static editPromise: null | ((args: EditResult) => void);
  root: NodeApi<T>;
  visibleNodes: NodeApi<T>[];
  visibleStartIndex: number = 0;
  visibleStopIndex: number = 0;
  idToIndex: { [id: string]: number };
  /* Memoized prefix-sum of row heights; only used for variable heights. */
  private rowOffsets: number[] | null = null;

  constructor(
    public store: Store<RootState, Actions>,
    public props: TreeProps<T>,
    public list: MutableRefObject<FixedSizeList | VariableSizeList | null>,
    public listEl: MutableRefObject<HTMLDivElement | null>,
  ) {
    /* Changes here must also be made in update() */
    this.root = createRoot<T>(this);
    this.visibleNodes = createList<T>(this);
    this.idToIndex = createIndex(this.visibleNodes);
  }

  /* Changes here must also be made in constructor() */
  update(props: TreeProps<T>) {
    this.props = props;
    this.root = createRoot<T>(this);
    this.visibleNodes = createList<T>(this);
    this.idToIndex = createIndex(this.visibleNodes);
    this.rowOffsets = null;
    /* Variable-height mode renders a VariableSizeList, which caches item
       measurements by index and never invalidates them on its own. When the
       visible nodes change (insert/remove/reorder), those cached sizes belong
       to the wrong rows, so drop them. Fixed-height mode renders a
       FixedSizeList (no cache, nothing to reset). update() runs during render,
       so pass shouldForceUpdate=false: the in-progress render repaints the list
       and a forceUpdate here would warn about setting state mid-render. */
    const list = this.list.current;
    if (list && "resetAfterIndex" in list) {
      list.resetAfterIndex(0, false);
    }
  }

  /* Store helpers */

  dispatch(action: Actions) {
    return this.store.dispatch(action);
  }

  get state() {
    return this.store.getState();
  }

  get openState() {
    return this.state.nodes.open.unfiltered;
  }

  /* Tree Props */

  get width() {
    return this.props.width ?? 300;
  }

  get height() {
    return this.props.height ?? 500;
  }

  get indent() {
    return this.props.indent ?? 24;
  }

  /**
   * The fixed row height. When a `rowHeight` function is supplied for variable
   * heights, this returns the default (24); use `rowHeightAt(index)` to get the
   * height of a specific row.
   */
  get rowHeight() {
    return typeof this.props.rowHeight === "number" ? this.props.rowHeight : 24;
  }

  /**
   * The height of the row at `index`, evaluating the `rowHeight` function if
   * given. Falls back to the default height for an out-of-range index so this
   * never feeds an invalid `0` to react-window's `itemSize`.
   */
  rowHeightAt = (index: number): number => {
    const rowHeight = this.props.rowHeight;
    if (typeof rowHeight === "function") {
      const node = this.at(index);
      return node ? rowHeight(node) : this.rowHeight;
    }
    return rowHeight ?? 24;
  };

  /** The pixel offset of the top of the row at `index` from the top of the list. */
  rowTopPosition = (index: number): number => {
    /* Fixed heights: O(1). */
    if (typeof this.props.rowHeight !== "function") {
      return index * this.rowHeight;
    }
    /* Variable heights: O(1) amortized via a memoized prefix sum. */
    const offsets = this.getRowOffsets();
    const clamped = Math.max(0, Math.min(index, offsets.length - 1));
    return offsets[clamped];
  };

  /**
   * Tell the underlying virtualized list to recompute row heights at and after
   * `index`. Call this if a `rowHeight` function's output changes for reasons
   * the tree can't observe (e.g. external state).
   */
  redrawList = (afterIndex: number = 0) => {
    this.rowOffsets = null;
    /* Only the VariableSizeList (function rowHeight) caches measurements; a
       FixedSizeList has constant heights and nothing to recompute. */
    const list = this.list.current;
    if (list && "resetAfterIndex" in list) {
      list.resetAfterIndex(Math.max(0, afterIndex));
    }
  };

  /** Lazily-built prefix sum where offsets[i] is the top of row i. */
  private getRowOffsets(): number[] {
    if (this.rowOffsets) return this.rowOffsets;
    const offsets: number[] = [0];
    for (let i = 0; i < this.visibleNodes.length; i++) {
      offsets.push(offsets[i] + this.rowHeightAt(i));
    }
    this.rowOffsets = offsets;
    return offsets;
  }

  get overscanCount() {
    return this.props.overscanCount ?? 1;
  }

  get searchTerm() {
    return (this.props.searchTerm || "").trim();
  }

  get matchFn() {
    const match =
      this.props.searchMatch ??
      ((node, term) => {
        const string = JSON.stringify(Object.values(node.data as { [k: string]: unknown }));
        return string.toLocaleLowerCase().includes(term.toLocaleLowerCase());
      });
    return (node: NodeApi<T>) => match(node, this.searchTerm);
  }

  accessChildren(data: T) {
    const get = this.props.childrenAccessor || "children";
    return utils.access<readonly T[] | undefined>(data, get) ?? null;
  }

  accessId(data: T) {
    const get = this.props.idAccessor || "id";
    const id = utils.access<string>(data, get);
    if (!id)
      throw new Error(
        "Data must contain an 'id' property or props.idAccessor must return a string",
      );
    return id;
  }

  /* Node Access */

  get firstNode() {
    return this.visibleNodes[0] ?? null;
  }

  get lastNode() {
    return this.visibleNodes[this.visibleNodes.length - 1] ?? null;
  }

  get focusedNode() {
    return this.get(this.state.nodes.focus.id) ?? null;
  }

  get mostRecentNode() {
    return this.get(this.state.nodes.selection.mostRecent) ?? null;
  }

  get nextNode() {
    const index = this.indexOf(this.focusedNode);
    if (index === null) return null;
    else return this.at(index + 1);
  }

  get prevNode() {
    const index = this.indexOf(this.focusedNode);
    if (index === null) return null;
    else return this.at(index - 1);
  }

  get(id: string | null): NodeApi<T> | null {
    if (!id) return null;
    if (id in this.idToIndex) return this.visibleNodes[this.idToIndex[id]] || null;
    else return null;
  }

  at(index: number): NodeApi<T> | null {
    return this.visibleNodes[index] || null;
  }

  nodesBetween(startId: string | null, endId: string | null) {
    if (startId === null || endId === null) return [];
    const index1 = this.indexOf(startId) ?? 0;
    const index2 = this.indexOf(endId);
    if (index2 === null) return [];
    const start = Math.min(index1, index2);
    const end = Math.max(index1, index2);
    return this.visibleNodes.slice(start, end + 1);
  }

  indexOf(id: Identity) {
    const key = utils.identifyNull(id);
    if (!key) return null;
    return this.idToIndex[key];
  }

  /* Data Operations */

  get editingId() {
    return this.state.nodes.edit.id;
  }

  createInternal() {
    return this.create({ type: "internal" });
  }

  createLeaf() {
    return this.create({ type: "leaf" });
  }

  async create(
    opts: {
      type?: "internal" | "leaf";
      parentId?: null | string;
      index?: null | number;
    } = {},
  ) {
    const parentId = opts.parentId === undefined ? utils.getInsertParentId(this) : opts.parentId;
    const index = opts.index ?? utils.getInsertIndex(this);
    const type = opts.type ?? "leaf";
    const data = await safeRun(this.props.onCreate, {
      type,
      parentId,
      index,
      parentNode: this.get(parentId),
    });
    if (data) {
      this.focus(data);
      setTimeout(() => {
        this.edit(data).then(() => {
          this.select(data);
          this.activate(data);
        });
      });
    }
  }

  async delete(node: Identity | string[] | IdObj[]) {
    if (!node) return;
    const idents = Array.isArray(node) ? node : [node];
    const ids = idents.map(identify);
    const nodes = ids.map((id) => this.get(id)!).filter((n) => !!n);
    /* Guard against Math.min(...[]) === Infinity when no ids resolve to nodes. */
    const fromIndex = nodes.length ? Math.min(...nodes.map((n) => n.rowIndex ?? 0)) : 0;
    await safeRun(this.props.onDelete, { nodes, ids });
    this.redrawList(fromIndex);
  }

  edit(node: string | IdObj): Promise<EditResult> {
    const id = identify(node);
    this.resolveEdit({ cancelled: true });
    this.scrollTo(id);
    this.dispatch(edit(id));
    this.redrawList(this.get(id)?.rowIndex ?? 0);
    return new Promise((resolve) => {
      TreeApi.editPromise = resolve;
    });
  }

  async submit(identity: Identity, value: string) {
    if (!identity) return;
    const id = identify(identity);
    await safeRun(this.props.onRename, {
      id,
      name: value,
      node: this.get(id)!,
    });
    this.dispatch(edit(null));
    this.resolveEdit({ cancelled: false, value });
    this.redrawList(this.get(id)?.rowIndex ?? 0);
    setTimeout(() => this.onFocus()); // Return focus to element;
  }

  reset() {
    this.dispatch(edit(null));
    this.resolveEdit({ cancelled: true });
    this.redrawList();
    setTimeout(() => this.onFocus()); // Return focus to element;
  }

  activate(id: Identity) {
    const node = this.get(identifyNull(id));
    if (!node) return;
    safeRun(this.props.onActivate, node);
  }

  private resolveEdit(value: EditResult) {
    const resolve = TreeApi.editPromise;
    if (resolve) resolve(value);
    TreeApi.editPromise = null;
  }

  /* Focus and Selection */

  get selectedIds() {
    return this.state.nodes.selection.ids;
  }

  get selectedNodes() {
    let nodes = [];
    for (let id of Array.from(this.selectedIds)) {
      const node = this.get(id);
      if (node) nodes.push(node);
    }
    return nodes;
  }

  focus(node: Identity, opts: { scroll?: boolean } = {}) {
    if (!node) return;
    /* Focus is responsible for scrolling, while selection is
     * responsible for focus. If selectionFollowsFocus, then
     * just select it. */
    if (this.props.selectionFollowsFocus) {
      this.select(node);
    } else {
      this.dispatch(focus(identify(node)));
      if (opts.scroll !== false) this.scrollTo(node);
      if (this.focusedNode) safeRun(this.props.onFocus, this.focusedNode);
    }
  }

  pageUp() {
    const start = this.visibleStartIndex;
    const stop = this.visibleStopIndex;
    const page = stop - start;
    let index = this.focusedNode?.rowIndex ?? 0;
    if (index > start) {
      index = start;
    } else {
      index = Math.max(start - page, 0);
    }
    this.focus(this.at(index));
  }

  pageDown() {
    const start = this.visibleStartIndex;
    const stop = this.visibleStopIndex;
    const page = stop - start;
    let index = this.focusedNode?.rowIndex ?? 0;
    if (index < stop) {
      index = stop;
    } else {
      index = Math.min(index + page, this.visibleNodes.length - 1);
    }
    this.focus(this.at(index));
  }

  select(node: Identity, opts: { align?: Align; focus?: boolean } = {}) {
    if (!node) return;
    const changeFocus = opts.focus !== false;
    const id = identify(node);
    if (changeFocus) this.dispatch(focus(id));
    if (this.get(id)?.isSelectable) {
      this.setSelection({
        ids: [id],
        anchor: id,
        mostRecent: id,
      });
    }
    this.scrollTo(id, opts.align);
    if (this.focusedNode && changeFocus) {
      safeRun(this.props.onFocus, this.focusedNode);
    }
  }

  deselect(node: Identity) {
    if (!node) return;
    const id = identify(node);
    this.dispatch(selection.remove(id));
    safeRun(this.props.onSelect, this.selectedNodes);
  }

  selectMulti(identity: Identity, opts: { align?: Align; focus?: boolean } = {}) {
    const node = this.get(identifyNull(identity));
    if (!node) return;
    const changeFocus = opts.focus !== false;
    if (changeFocus) this.dispatch(focus(node.id));
    if (node.isSelectable) {
      this.dispatch(selection.add(node.id));
      this.dispatch(selection.anchor(node.id));
      this.dispatch(selection.mostRecent(node.id));
    }
    this.scrollTo(node, opts.align);
    if (this.focusedNode && changeFocus) {
      safeRun(this.props.onFocus, this.focusedNode);
    }
    safeRun(this.props.onSelect, this.selectedNodes);
  }

  selectContiguous(identity: Identity) {
    if (!identity) return;
    const id = identify(identity);
    this.dispatch(focus(id));
    if (this.get(id)?.isSelectable) {
      const { anchor, mostRecent } = this.state.nodes.selection;
      const selectableNodes = this.filterSelectableNodes(
        this.nodesBetween(anchor, identifyNull(id)),
      );
      this.dispatch(selection.remove(this.nodesBetween(anchor, mostRecent)));
      this.dispatch(selection.add(selectableNodes));
      this.dispatch(selection.mostRecent(id));
    }
    this.scrollTo(id);
    if (this.focusedNode) safeRun(this.props.onFocus, this.focusedNode);
    safeRun(this.props.onSelect, this.selectedNodes);
  }

  deselectAll() {
    // setSelection fires onSelect; don't fire it again here (see #332).
    this.setSelection({ ids: [], anchor: null, mostRecent: null });
  }

  selectAll() {
    const allSelectableNodes = this.filterSelectableNodes(Object.keys(this.idToIndex));
    // setSelection fires onSelect; don't fire it again here (see #332).
    this.setSelection({
      ids: allSelectableNodes,
      anchor: allSelectableNodes[0] ?? null,
      mostRecent: allSelectableNodes[allSelectableNodes.length - 1] ?? null,
    });
    this.dispatch(focus(this.lastNode?.id));
    if (this.focusedNode) safeRun(this.props.onFocus, this.focusedNode);
  }

  private filterSelectableNodes(nodes: (IdObj | string)[]) {
    return nodes
      .map((n) => this.get(identify(n)))
      .filter((n): n is NodeApi<T> => !!n && n.isSelectable);
  }

  setSelection(args: { ids: (IdObj | string)[] | null; anchor: Identity; mostRecent: Identity }) {
    const ids = new Set(args.ids?.map(identify));
    const anchor = identifyNull(args.anchor);
    const mostRecent = identifyNull(args.mostRecent);
    this.dispatch(selection.set({ ids, anchor, mostRecent }));
    safeRun(this.props.onSelect, this.selectedNodes);
  }

  /* Drag and Drop */

  get cursorParentId() {
    const { cursor } = this.state.dnd;
    switch (cursor.type) {
      case "highlight":
        return cursor.id;
      default:
        return null;
    }
  }

  get cursorOverFolder() {
    return this.state.dnd.cursor.type === "highlight";
  }

  get dragNodes() {
    return this.state.dnd.dragIds.map((id) => this.get(id)).filter((n) => !!n) as NodeApi<T>[];
  }

  get dragNode() {
    return this.get(this.state.nodes.drag.id);
  }

  get dragDestinationParent() {
    return this.get(this.state.nodes.drag.destinationParentId);
  }

  get dragDestinationIndex() {
    return this.state.nodes.drag.destinationIndex;
  }

  canDrop() {
    if (this.isFiltered) return false;
    const parentNode = this.get(this.state.dnd.parentId) ?? this.root;
    const dragNodes = this.dragNodes;
    const isDisabled = this.props.disableDrop;

    for (const drag of dragNodes) {
      if (!drag) return false;
      if (!parentNode) return false;
      if (drag.isInternal && utils.isDescendant(parentNode, drag)) return false;
    }

    // Allow the user to insert their own logic
    if (typeof isDisabled == "function") {
      return !isDisabled({
        parentNode,
        dragNodes: this.dragNodes,
        index: this.state.dnd.index || 0,
      });
    } else if (typeof isDisabled == "string") {
      // @ts-ignore
      return !parentNode.data[isDisabled];
    } else if (typeof isDisabled === "boolean") {
      return !isDisabled;
    } else {
      return true;
    }
  }

  hideCursor() {
    this.dispatch(dnd.cursor({ type: "none" }));
  }

  showCursor(cursor: Cursor) {
    this.dispatch(dnd.cursor(cursor));
  }

  /* Visibility */

  open(identity: Identity, redraw: boolean = true) {
    const id = identifyNull(identity);
    if (!id) return;
    if (this.isOpen(id)) return;
    this.dispatch(visibility.open(id, this.isFiltered));
    if (redraw) this.redrawList(this.get(id)?.rowIndex ?? 0);
    safeRun(this.props.onToggle, id);
  }

  close(identity: Identity, redraw: boolean = true) {
    const id = identifyNull(identity);
    if (!id) return;
    if (!this.isOpen(id)) return;
    this.dispatch(visibility.close(id, this.isFiltered));
    if (redraw) this.redrawList(this.get(id)?.rowIndex ?? 0);
    safeRun(this.props.onToggle, id);
  }

  toggle(identity: Identity) {
    const id = identifyNull(identity);
    if (!id) return;
    return this.isOpen(id) ? this.close(id) : this.open(id);
  }

  openParents(identity: Identity) {
    const id = identifyNull(identity);
    if (!id) return;
    const node = utils.dfs(this.root, id);
    let parent = node?.parent;

    while (parent) {
      this.open(parent.id, false);
      parent = parent.parent;
    }
    this.redrawList();
  }

  openSiblings(node: NodeApi<T>) {
    const parent = node.parent;
    if (!parent) {
      this.toggle(node.id);
    } else if (parent.children) {
      const isOpen = node.isOpen;
      for (let sibling of parent.children) {
        if (sibling.isInternal) {
          if (isOpen) this.close(sibling.id, false);
          else this.open(sibling.id, false);
        }
      }
      this.redrawList();
      this.scrollTo(this.focusedNode);
    }
  }

  openAll() {
    utils.walk(this.root, (node) => {
      if (node.isInternal) this.open(node.id, false);
    });
    this.redrawList();
  }

  closeAll() {
    utils.walk(this.root, (node) => {
      if (node.isInternal) this.close(node.id, false);
    });
    this.redrawList();
  }

  /* Scrolling */

  scrollTo(identity: Identity, align: Align = "smart") {
    if (!identity) return;
    const id = identify(identity);
    this.openParents(id);
    return utils
      .waitFor(() => id in this.idToIndex)
      .then(() => {
        const index = this.idToIndex[id];
        if (index === undefined) return;
        this.list.current?.scrollToItem(index, align);
      })
      .catch(() => {
        // Id: ${id} never appeared in the list.
      });
  }

  /* State Checks */

  get isEditing() {
    return this.state.nodes.edit.id !== null;
  }

  get isFiltered() {
    return !!this.props.searchTerm?.trim();
  }

  get hasFocus() {
    return this.state.nodes.focus.treeFocused;
  }

  get hasNoSelection() {
    return this.state.nodes.selection.ids.size === 0;
  }

  get hasOneSelection() {
    return this.state.nodes.selection.ids.size === 1;
  }

  get hasMultipleSelections() {
    return this.state.nodes.selection.ids.size > 1;
  }

  isSelected(id?: string) {
    if (!id) return false;
    return this.state.nodes.selection.ids.has(id);
  }

  isOpen(id?: string) {
    if (!id) return false;
    if (id === ROOT_ID) return true;
    const def = this.props.openByDefault ?? true;
    if (this.isFiltered) {
      return this.state.nodes.open.filtered[id] ?? true; // Filtered folders are always opened by default
    } else {
      return this.state.nodes.open.unfiltered[id] ?? def;
    }
  }

  isEditable(data: T) {
    return this.isActionPossible(data, this.props.disableEdit);
  }

  isDraggable(data: T) {
    return this.isActionPossible(data, this.props.disableDrag);
  }

  isSelectable(data: T) {
    return this.isActionPossible(data, this.props.disableSelect);
  }

  private isActionPossible(data: T, disabler: string | boolean | BoolFunc<T> = () => false) {
    return !utils.access(data, disabler);
  }

  isDragging(node: Identity) {
    const id = identifyNull(node);
    if (!id) return false;
    return this.state.nodes.drag.id === id;
  }

  isFocused(id: string) {
    return this.hasFocus && this.state.nodes.focus.id === id;
  }

  isMatch(node: NodeApi<T>) {
    return this.matchFn(node);
  }

  willReceiveDrop(node: Identity) {
    const id = identifyNull(node);
    if (!id) return false;
    const { destinationParentId, destinationIndex } = this.state.nodes.drag;
    return id === destinationParentId && destinationIndex === null;
  }

  /* Tree Event Handlers */

  onFocus() {
    const node = this.focusedNode || this.firstNode;
    if (node) this.dispatch(focus(node.id));
  }

  onBlur() {
    this.dispatch(treeBlur());
  }

  onItemsRendered(args: ListOnItemsRenderedProps) {
    this.visibleStartIndex = args.visibleStartIndex;
    this.visibleStopIndex = args.visibleStopIndex;
  }

  /* Get Renderers */

  get renderContainer() {
    return this.props.renderContainer || DefaultContainer;
  }

  get renderRow() {
    return this.props.renderRow || DefaultRow;
  }

  get renderNode() {
    return this.props.children || DefaultNode;
  }

  get renderDragPreview() {
    return this.props.renderDragPreview || DefaultDragPreview;
  }

  get renderCursor() {
    return this.props.renderCursor || DefaultCursor;
  }
}
