import React from "react";
import { TreeApi } from "./tree-api";
import { IdObj } from "../types/utils";
import { ROOT_ID } from "../data/create-root";

type Params<T> = {
  id: string;
  data: T;
  level: number;
  children: NodeApi<T>[] | null;
  parent: NodeApi<T> | null;
  isDraggable: boolean;
  rowIndex: number | null;
  tree: TreeApi<T>;
};

export class NodeApi<T = any> {
  tree: TreeApi<T>;
  id: string;
  data: T;
  level: number;
  children: NodeApi<T>[] | null;
  parent: NodeApi<T> | null;
  isDraggable: boolean;
  rowIndex: number | null;

  constructor(params: Params<T>) {
    this.tree = params.tree;
    this.id = params.id;
    this.data = params.data;
    this.level = params.level;
    this.children = params.children;
    this.parent = params.parent;
    this.isDraggable = params.isDraggable;
    this.rowIndex = params.rowIndex;
  }

  get isRoot() {
    return this.id === ROOT_ID;
  }

  get isLeaf() {
    return !Array.isArray(this.children);
  }

  get isInternal() {
    return !this.isLeaf;
  }

  get isOpen() {
    return this.isLeaf ? false : this.tree.isOpen(this.id);
  }

  get isClosed() {
    return this.isLeaf ? false : !this.tree.isOpen(this.id);
  }

  get isEditable() {
    return this.tree.isEditable(this.data);
  }

  get isSelectable() {
    return this.tree.isSelectable(this.data);
  }

  get isEditing() {
    return this.tree.editingId === this.id;
  }

  get isSelected() {
    return this.tree.isSelected(this.id);
  }

  get isOnlySelection() {
    return this.isSelected && this.tree.hasOneSelection;
  }

  get isSelectedStart() {
    return this.isSelected && !this.prev?.isSelected;
  }

  get isSelectedEnd() {
    return this.isSelected && !this.next?.isSelected;
  }

  get isFocused() {
    return this.tree.isFocused(this.id);
  }

  get isDragging() {
    return this.tree.isDragging(this.id);
  }

  get willReceiveDrop() {
    return this.tree.willReceiveDrop(this.id);
  }

  get state() {
    return {
      isClosed: this.isClosed,
      isDragging: this.isDragging,
      isEditing: this.isEditing,
      isFocused: this.isFocused,
      isInternal: this.isInternal,
      isLeaf: this.isLeaf,
      isOpen: this.isOpen,
      isSelected: this.isSelected,
      isSelectedEnd: this.isSelectedEnd,
      isSelectedStart: this.isSelectedStart,
      willReceiveDrop: this.willReceiveDrop,
    };
  }

  get childIndex() {
    if (this.parent && this.parent.children) {
      return this.parent.children.findIndex((child) => child.id === this.id);
    } else {
      return -1;
    }
  }

  get next(): NodeApi<T> | null {
    if (this.rowIndex === null) return null;
    return this.tree.at(this.rowIndex + 1);
  }

  get prev(): NodeApi<T> | null {
    if (this.rowIndex === null) return null;
    return this.tree.at(this.rowIndex - 1);
  }

  get nextSibling(): NodeApi<T> | null {
    const i = this.childIndex;
    return this.parent?.children![i + 1] ?? null;
  }

  isAncestorOf(node: NodeApi<T> | null) {
    if (!node) return false;
    let ancestor: NodeApi<T> | null = node;
    while (ancestor) {
      if (ancestor.id === this.id) return true;
      ancestor = ancestor.parent;
    }
    return false;
  }

  select() {
    this.tree.select(this);
  }

  deselect() {
    this.tree.deselect(this);
  }

  selectMulti() {
    this.tree.selectMulti(this);
  }

  selectContiguous() {
    this.tree.selectContiguous(this);
  }

  activate() {
    this.tree.activate(this);
  }

  focus() {
    this.tree.focus(this);
  }

  toggle() {
    this.tree.toggle(this);
  }

  open() {
    this.tree.open(this);
  }

  openParents() {
    this.tree.openParents(this);
  }

  close() {
    this.tree.close(this);
  }

  submit(value: string) {
    this.tree.submit(this, value);
  }

  reset() {
    this.tree.reset();
  }

  clone() {
    return new NodeApi<T>({ ...this });
  }

  edit() {
    return this.tree.edit(this);
  }

  handleClick = (e: React.MouseEvent) => {
    if (e.metaKey && !this.tree.props.disableMultiSelection) {
      this.isSelected ? this.deselect() : this.selectMulti();
    } else if (e.shiftKey && !this.tree.props.disableMultiSelection) {
      this.selectContiguous();
    } else {
      this.select();
      this.activate();
    }
  };
}
