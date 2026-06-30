/**
 * Unit tests for computeDrop — the pure function that maps a hover position
 * (element rect + cursor offset + surrounding nodes) to a drop target and
 * visual cursor shape.
 *
 * computeDrop is called on every mousemove during a drag, so correctness here
 * directly determines where nodes land after a drop.  It has no react-dnd
 * dependency; all inputs are plain data, making it straightforward to test
 * exhaustively without a DnD provider.
 */

import { computeDrop, ComputedDrop } from "./compute-drop";
import { NodeApi } from "../interfaces/node-api";

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

const INDENT = 24;
const ROW_HEIGHT = 32;

/**
 * Build a fake HTMLElement whose getBoundingClientRect returns a row at the
 * given vertical position (full-width, ROW_HEIGHT tall).
 */
function fakeEl(top: number): HTMLElement {
  const el = document.createElement("div");
  jest.spyOn(el, "getBoundingClientRect").mockReturnValue({
    top,
    bottom: top + ROW_HEIGHT,
    left: 0,
    right: 800,
    height: ROW_HEIGHT,
    width: 800,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });
  return el;
}

/** Offset that lands in the top quarter of a row (atTop = true). */
function topOf(elTop: number) {
  return { x: INDENT, y: elTop + ROW_HEIGHT * 0.1 };
}

/** Offset that lands in the middle of a row (inMiddle = true). */
function middleOf(elTop: number) {
  return { x: INDENT, y: elTop + ROW_HEIGHT * 0.5 };
}

/** Offset that lands in the bottom quarter of a row (atBottom = true). */
function bottomOf(elTop: number) {
  return { x: INDENT, y: elTop + ROW_HEIGHT * 0.9 };
}

/**
 * Wire sibling nodes to a shared virtual parent so that indexOf() (used inside
 * walkUpFrom) can find each node in parent.children.  Call this after creating
 * all sibling stubs so that the children array is fully populated.
 */
function linkSiblings(...nodes: NodeApi[]): NodeApi {
  const parent = makeNode({
    id: "virtual-root",
    level: -1,
    isInternal: true,
    isOpen: true,
  });
  (parent as unknown as { children: NodeApi[] }).children = nodes;
  nodes.forEach((n) => {
    (n as unknown as { parent: NodeApi }).parent = parent;
  });
  return parent;
}

/** Build a minimal NodeApi stub. */
function makeNode(
  overrides: Partial<{
    id: string;
    level: number;
    isInternal: boolean;
    isLeaf: boolean;
    isOpen: boolean;
    rowIndex: number;
    parent: NodeApi | null;
    children: NodeApi[];
  }>,
): NodeApi {
  const isInternal = overrides.isInternal ?? false;
  return {
    id: "node",
    level: 0,
    isInternal,
    // isLeaf is the inverse of isInternal when not overridden — isItem() checks isLeaf.
    isLeaf: overrides.isLeaf ?? !isInternal,
    isOpen: false,
    rowIndex: 0,
    parent: null,
    children: [],
    ...overrides,
  } as unknown as NodeApi;
}

/* ------------------------------------------------------------------ */
/* 1. Hovering over an open folder's middle → highlight cursor          */
/* ------------------------------------------------------------------ */

test("hovering the middle of an open folder highlights it as the drop target", () => {
  const folder = makeNode({ id: "folder", isInternal: true, isOpen: true, level: 0, rowIndex: 0 });
  const el = fakeEl(0);

  const result: ComputedDrop = computeDrop({
    element: el,
    offset: middleOf(0),
    indent: INDENT,
    node: folder,
    prevNode: null,
    nextNode: null,
  });

  expect(result.cursor).toEqual({ type: "highlight", id: "folder" });
  expect(result.drop).toEqual({ parentId: "folder", index: null });
});

/* ------------------------------------------------------------------ */
/* 2. Hovering top half of an item → cursor above it                    */
/* ------------------------------------------------------------------ */

test("hovering the top half of a leaf node places the cursor above it", () => {
  const prev = makeNode({ id: "prev", level: 0, rowIndex: 0 });
  const node = makeNode({ id: "node", level: 0, rowIndex: 1 });
  // linkSiblings wires parent.children so indexOf() inside walkUpFrom doesn't throw.
  linkSiblings(prev, node);
  const el = fakeEl(ROW_HEIGHT);

  const result = computeDrop({
    element: el,
    offset: topOf(ROW_HEIGHT),
    indent: INDENT,
    node,
    prevNode: prev,
    nextNode: null,
  });

  // Cursor at row index 1 (the node's own row), level 0
  expect(result.cursor).toMatchObject({ type: "line", index: 1 });
  expect(result.drop).not.toBeNull();
});

/* ------------------------------------------------------------------ */
/* 3. Hovering bottom half of a leaf node → cursor below it             */
/* ------------------------------------------------------------------ */

test("hovering the bottom half of a leaf node places the cursor below it", () => {
  const node = makeNode({ id: "node", level: 0, rowIndex: 0 });
  const next = makeNode({ id: "next", level: 0, rowIndex: 1 });
  linkSiblings(node, next);
  const el = fakeEl(0);

  const result = computeDrop({
    element: el,
    offset: bottomOf(0),
    indent: INDENT,
    node,
    prevNode: null,
    nextNode: next,
  });

  expect(result.cursor).toMatchObject({ type: "line", index: 1 });
  expect(result.drop).not.toBeNull();
});

/* ------------------------------------------------------------------ */
/* 4. Hovering an empty list → cursor at index 0, level 0               */
/* ------------------------------------------------------------------ */

test("hovering over an empty list places the cursor at the very top", () => {
  const el = fakeEl(0);

  const result = computeDrop({
    element: el,
    offset: middleOf(0),
    indent: INDENT,
    node: null,
    prevNode: null,
    nextNode: null,
  });

  expect(result.cursor).toEqual({ type: "line", index: 0, level: 0 });
  expect(result.drop).toEqual({ parentId: null, index: 0 });
});

/* ------------------------------------------------------------------ */
/* 5. Hovering below all items (node=null, prevNode set)                 */
/* ------------------------------------------------------------------ */

test("hovering below the last item places the cursor at the end of the list", () => {
  const last = makeNode({ id: "last", level: 0, rowIndex: 2 });
  linkSiblings(last);
  const el = fakeEl(2 * ROW_HEIGHT);

  const result = computeDrop({
    element: el,
    offset: middleOf(2 * ROW_HEIGHT),
    indent: INDENT,
    node: null,
    prevNode: last,
    nextNode: null,
  });

  // The cursor and drop should be below the last item (index 3)
  expect(result.cursor).toMatchObject({ type: "line" });
  expect(result.drop).not.toBeNull();
});

/* ------------------------------------------------------------------ */
/* 6. Hovering top half of a closed folder → cursor above it            */
/* ------------------------------------------------------------------ */

test("hovering the top of a closed folder places cursor above the folder", () => {
  const prev = makeNode({ id: "prev", level: 0, rowIndex: 0 });
  const folder = makeNode({
    id: "folder",
    level: 0,
    isInternal: true,
    isOpen: false,
    rowIndex: 1,
  });
  linkSiblings(prev, folder);
  const el = fakeEl(ROW_HEIGHT);

  const result = computeDrop({
    element: el,
    offset: topOf(ROW_HEIGHT),
    indent: INDENT,
    node: folder,
    prevNode: prev,
    nextNode: null,
  });

  expect(result.cursor).toMatchObject({ type: "line", index: 1 });
});

/* ------------------------------------------------------------------ */
/* 7. x-position drives nesting level                                   */
/* ------------------------------------------------------------------ */

test("x position at a deeper indent level resolves to a deeper drop level", () => {
  const parent = makeNode({ id: "parent", level: 0, rowIndex: 0, isInternal: true });
  const node = makeNode({ id: "node", level: 1, rowIndex: 1 });
  /* Build a fake parent chain so walkUpFrom can traverse it.
     indexOf() calls parent.children.findIndex(), so children must include the node. */
  const nodeWithParent = { ...node, parent } as unknown as NodeApi;
  (parent as unknown as { children: NodeApi[] }).children = [nodeWithParent];

  const el = fakeEl(ROW_HEIGHT);

  /* Offset x at 2 * INDENT → hoverLevel = 1 */
  const result = computeDrop({
    element: el,
    offset: { x: 2 * INDENT, y: el.getBoundingClientRect().top + ROW_HEIGHT * 0.9 },
    indent: INDENT,
    node: nodeWithParent,
    prevNode: null,
    nextNode: null,
  });

  // Cursor level should be bounded by the node's level (1)
  expect(result.cursor).toMatchObject({ type: "line" });
});
