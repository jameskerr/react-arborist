import { createStore } from "redux";
import { rootReducer } from "../state/root-reducer";
import { ROOT_ID } from "../data/create-root";
import { TreeProps } from "../types/tree-props";
import { TreeApi } from "../interfaces/tree-api";
import { computeDrop, isTopPaddingDrop } from "./compute-drop";

const ROW = 40; // height; top edge at y<10, middle 10..30, bottom edge y>30
const INDENT = 24;

function setupApi(props: TreeProps<any>) {
  const store = createStore(rootReducer);
  return new TreeApi(
    store,
    { indent: INDENT, rowHeight: ROW, ...props },
    { current: null },
    {
      current: null,
    },
  );
}

/*
 * Drive computeDrop against a hovered row. The row's rect is pinned at the
 * origin so `offset` doubles as the in-row coordinate:
 *   - y picks the vertical band (5 = top edge, 20 = middle, 35 = bottom edge)
 *   - x picks the horizontal drop level; hoverLevel = round((x - indent)/indent),
 *     so x = (level + 1) * indent targets `level`, and a large x slides fully right.
 */
function hover(api: TreeApi<any>, id: string, x: number, y: number) {
  const node = api.get(id)!;
  const element = {
    getBoundingClientRect: () => ({ x: 0, y: 0, height: ROW }),
  } as unknown as HTMLElement;
  return computeDrop({
    element,
    offset: { x, y },
    indent: api.indent,
    node,
    prevNode: node.prev,
    nextNode: node.next,
  });
}

function hoverFromGrabPoint(
  api: TreeApi<any>,
  id: string,
  initialX: number,
  x: number,
  y: number,
  sourceLevel: number,
) {
  const node = api.get(id)!;
  const element = {
    getBoundingClientRect: () => ({ x: 0, y: 0, height: ROW }),
  } as unknown as HTMLElement;
  return computeDrop({
    element,
    initialOffset: { x: initialX, y },
    offset: { x, y },
    indent: api.indent,
    node,
    prevNode: node.prev,
    nextNode: node.next,
    sourceLevel,
  });
}

const AT_TOP = 5;
const MIDDLE = 20;
const AT_BOTTOM = 35;
const DEEP = 1000; // slides fully right
const levelX = (level: number) => (level + 1) * INDENT;

/*
 * Visible tree (all folders open by default):
 *   a                 item,          level 0, root index 0
 *   F                 open folder,   level 0, root index 1
 *     G               open folder,   level 1, F index 0
 *       C             item,          level 2, G index 0
 *   E                 empty folder,  level 0, root index 2
 *   z                 item,          level 0, root index 3
 */
const data = [
  { id: "a" },
  { id: "F", children: [{ id: "G", children: [{ id: "C" }] }] },
  { id: "E", children: [] },
  { id: "z" },
];

describe("computeDrop", () => {
  test("distinguishes visible top padding from the bottom outer drop zone", () => {
    const element = {
      getBoundingClientRect: () => ({ top: 100 }),
    } as HTMLElement;

    expect(isTopPaddingDrop(element, { x: 20, y: 107 }, 8, 0)).toBe(true);
    expect(isTopPaddingDrop(element, { x: 20, y: 108 }, 8, 0)).toBe(false);
    expect(isTopPaddingDrop(element, { x: 20, y: 106 }, 8, 1)).toBe(true);
    expect(isTopPaddingDrop(element, { x: 20, y: 107 }, 8, 1)).toBe(false);
    expect(isTopPaddingDrop(element, { x: 20, y: 100 }, 8, 8)).toBe(false);
  });

  test("drops before the first node when the outer target supplies it as the next node", () => {
    const api = setupApi({ data });
    const first = api.get("a")!;
    const result = computeDrop({
      element: {
        getBoundingClientRect: () => ({ height: 200, x: 0, y: 0 }),
      } as HTMLElement,
      indent: api.indent,
      nextNode: first,
      node: null,
      offset: { x: 20, y: 70 },
      prevNode: null,
    });

    expect(result.drop).toEqual({ parentId: ROOT_ID, index: 0 });
    expect(result.cursor).toEqual({ type: "line", index: 0, level: 0 });
  });

  describe("whole-row drag sources", () => {
    test("uses horizontal movement from the grab point instead of its absolute x-position", () => {
      const api = setupApi({ data });

      const verticalOnly = hoverFromGrabPoint(api, "F", 300, 300, AT_BOTTOM, 0);
      expect(verticalOnly.drop).toEqual({ parentId: ROOT_ID, index: 2 });
      expect(verticalOnly.cursor).toEqual({ type: "line", index: 2, level: 0 });

      const nestedVerticalOnly = hoverFromGrabPoint(api, "G", 300, 300, AT_BOTTOM, 1);
      expect(nestedVerticalOnly.drop).toEqual({ parentId: "F", index: 1 });
      expect(nestedVerticalOnly.cursor).toEqual({ type: "line", index: 3, level: 1 });

      const deliberateIndent = hoverFromGrabPoint(api, "F", 300, 313, AT_BOTTOM, 0);
      expect(deliberateIndent.drop).toEqual({ parentId: "F", index: 0 });
      expect(deliberateIndent.cursor).toEqual({ type: "line", index: 2, level: 1 });
    });
  });

  describe("existing branches (regression net)", () => {
    test("middle of a folder drops into it and highlights the row", () => {
      const api = setupApi({ data });
      const { drop, cursor } = hover(api, "F", levelX(0), MIDDLE);
      expect(drop).toEqual({ parentId: "F", index: null });
      expect(cursor).toEqual({ type: "highlight", id: "F" });
    });

    test("top of the first row drops at the top of the root", () => {
      const api = setupApi({ data });
      const { drop, cursor } = hover(api, "a", levelX(0), AT_TOP);
      expect(drop).toEqual({ parentId: ROOT_ID, index: 0 });
      expect(cursor).toEqual({ type: "line", index: 0, level: 0 });
    });

    test("below an item, sliding left walks up the ancestor chain", () => {
      const api = setupApi({ data });
      // Below C (level 2); its next row z is level 0, so the slide spans 0..2.
      const deep = hover(api, "C", DEEP, AT_BOTTOM);
      expect(deep.drop).toEqual({ parentId: "G", index: 1 }); // next sibling of C
      const shallow = hover(api, "C", levelX(0), AT_BOTTOM);
      expect(shallow.drop).toEqual({ parentId: ROOT_ID, index: 2 }); // after F, at root
    });

    test("below a closed folder behaves like an item", () => {
      const api = setupApi({ data });
      api.close("F", false); // rebuild the visible list so F's next row is E
      api.update(api.props);
      // With F closed, its next row is E (level 0). Sliding right pins to F's level.
      const deep = hover(api, "F", DEEP, AT_BOTTOM);
      expect(deep.drop).toEqual({ parentId: ROOT_ID, index: 2 }); // sibling after F
    });

    test("empty open folder: deep drops inside, shallow drops as a sibling", () => {
      const api = setupApi({ data });
      const deep = hover(api, "E", DEEP, AT_BOTTOM);
      expect(deep.drop).toEqual({ parentId: "E", index: 0 }); // first child of E
      const shallow = hover(api, "E", levelX(0), AT_BOTTOM);
      expect(shallow.drop).toEqual({ parentId: ROOT_ID, index: 3 }); // sibling after E
    });
  });

  describe("open folder with children (#330)", () => {
    test("sliding right still drops as the folder's first child", () => {
      const api = setupApi({ data });
      const { drop, cursor } = hover(api, "F", DEEP, AT_BOTTOM);
      expect(drop).toEqual({ parentId: "F", index: 0 });
      expect(cursor).toEqual({ type: "line", index: 2, level: 1 });
    });

    test("sliding left drops as the folder's next sibling", () => {
      const api = setupApi({ data });
      const { drop, cursor } = hover(api, "F", levelX(0), AT_BOTTOM);
      expect(drop).toEqual({ parentId: ROOT_ID, index: 2 }); // after F, at root
      expect(cursor).toEqual({ type: "line", index: 2, level: 0 });
    });

    test("a nested folder can drop as sibling or grandsibling, bounded by its ancestors", () => {
      const api = setupApi({ data });
      // Between G (level 1) and its child C (level 2).
      const child = hover(api, "G", DEEP, AT_BOTTOM);
      expect(child.drop).toEqual({ parentId: "G", index: 0 }); // first child of G
      const sibling = hover(api, "G", levelX(1), AT_BOTTOM);
      expect(sibling.drop).toEqual({ parentId: "F", index: 1 }); // after G, inside F
      const grandsibling = hover(api, "G", levelX(0), AT_BOTTOM);
      expect(grandsibling.drop).toEqual({ parentId: ROOT_ID, index: 2 }); // after F, at root
    });
  });
});
