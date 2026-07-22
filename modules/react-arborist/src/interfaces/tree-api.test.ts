import { createStore } from "redux";
import { rootReducer } from "../state/root-reducer";
import { actions as dnd } from "../state/dnd-slice";
import { TreeProps } from "../types/tree-props";
import { TreeApi } from "./tree-api";
import { NodeApi } from "./node-api";

function setupApi(props: TreeProps<any>) {
  const store = createStore(rootReducer);
  return new TreeApi(store, props, { current: null }, { current: null });
}

test("tree.canDrop()", () => {
  expect(setupApi({ disableDrop: true }).canDrop()).toBe(false);
  expect(setupApi({ disableDrop: () => false }).canDrop()).toBe(true);
  expect(setupApi({ disableDrop: false }).canDrop()).toBe(true);
});

const rowData = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("tree.drop() fires onMove (#313)", () => {
  test("reports the hovered parent and index, mapping the root id to null", () => {
    const onMove = jest.fn();
    const api = setupApi({ data: rowData, onMove });
    // The bottom drop zone hovers the root with an index past the end, just like
    // computeDrop() reports it. tree.drop() should map the root id back to null.
    api.dispatch(dnd.dragStart("a", ["a"]));
    api.dispatch(dnd.hovering(api.root.id, 3));
    api.drop();
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ dragIds: ["a"], parentId: null, index: 3 }),
    );
  });

  test("coerces a null index (dropped onto a folder) to 0", () => {
    const onMove = jest.fn();
    const folderData = [{ id: "folder", children: [{ id: "child" }] }];
    const api = setupApi({ data: folderData, onMove });
    // Dropping onto a folder (rather than between rows) reports the folder as the
    // parent with a null index, which tree.drop() should coerce to 0.
    api.dispatch(dnd.dragStart("child", ["child"]));
    api.dispatch(dnd.hovering("folder", null));
    api.drop();
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ parentId: "folder", index: 0 }));
  });
});

describe("custom idAccessor is honored when methods receive raw data (#347)", () => {
  const uuidData = [{ uuid: "a" }, { uuid: "b" }, { uuid: "c" }];

  test("select(data) resolves the id through idAccessor", () => {
    const onSelect = jest.fn();
    const api = setupApi({ data: uuidData, idAccessor: "uuid", onSelect });
    api.select(uuidData[1]);
    expect(api.selectedIds.has("b")).toBe(true);
    expect(api.selectedNodes.map((n) => n.id)).toEqual(["b"]);
  });

  test("focus(data) resolves the id through idAccessor", () => {
    const api = setupApi({ data: uuidData, idAccessor: "uuid" });
    api.focus(uuidData[2]);
    expect(api.focusedNode?.id).toBe("c");
  });

  test("delete(data) passes the accessor-derived id to onDelete", () => {
    const onDelete = jest.fn();
    const api = setupApi({ data: uuidData, idAccessor: "uuid", onDelete });
    api.delete(uuidData[0]);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ ids: ["a"] }));
  });

  test("create() focuses the new node by its accessor-derived id", async () => {
    // create() passes the raw row data returned by onCreate straight to
    // focus/edit/select; before the fix these read `.id` and lost the node.
    const onCreate = () => ({ uuid: "new" });
    const api = setupApi({ data: uuidData, idAccessor: "uuid", onCreate });
    await api.create();
    expect(api.state.nodes.focus.id).toBe("new");
  });

  test("a function idAccessor is honored too", () => {
    const fnData = [{ meta: { key: "x" } }, { meta: { key: "y" } }];
    const api = setupApi({
      data: fnData,
      idAccessor: (d: any) => d.meta.key,
    });
    api.select(fnData[1]);
    expect(api.selectedIds.has("y")).toBe(true);
  });

  test("selectContiguous resolves nodes to accessor-derived ids", () => {
    // selectContiguous feeds NodeApi lists to the selection slice, which stores
    // ids. Those must be the accessor-derived ids, not `undefined` from a missing
    // `.id` — guards the string-only selection slice against a custom accessor.
    const api = setupApi({
      data: [{ uuid: "a" }, { uuid: "b" }, { uuid: "c" }, { uuid: "d" }],
      idAccessor: "uuid",
    });
    api.select("a");
    api.selectContiguous("c");
    expect([...api.selectedIds].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("custom idAccessor flows through drag-and-drop onMove (#170)", () => {
  // Data keyed by `uuid` instead of `id`, with a folder to reorder into. The
  // drag hook and computeDrop only ever see `node.id`, which createRoot derives
  // via the accessor — so onMove should report uuid values, never `undefined`.
  const uuidData = [{ uuid: "folder", children: [{ uuid: "child" }] }, { uuid: "sibling" }];

  test("dropping onto a folder reports accessor-derived dragIds and parentId", () => {
    const onMove = jest.fn();
    const api = setupApi({ data: uuidData, idAccessor: "uuid", onMove });
    const [folder, sibling] = api.root.children!;
    // Sanity: node ids come from the accessor, not a missing `.id`.
    expect([folder.id, sibling.id]).toEqual(["folder", "sibling"]);

    // Drag "sibling" onto the folder, exactly as the drag hook + computeDrop do:
    // both feed `node.id` into the dnd state that tree.drop() reads back.
    api.dispatch(dnd.dragStart(sibling.id, [sibling.id]));
    api.dispatch(dnd.hovering(folder.id, null));
    api.drop();

    expect(onMove).toHaveBeenCalledTimes(1);
    const args = onMove.mock.calls[0][0];
    expect(args).toEqual(
      expect.objectContaining({ dragIds: ["sibling"], parentId: "folder", index: 0 }),
    );
    expect(args.parentNode?.id).toBe("folder");
  });

  test("reordering at the root reports accessor-derived ids with parentId null", () => {
    const onMove = jest.fn();
    const api = setupApi({ data: uuidData, idAccessor: "uuid", onMove });
    const sibling = api.root.children![1];

    // Reorder "sibling" above "folder" at the root; computeDrop reports the root
    // id, which tree.drop() maps back to null.
    api.dispatch(dnd.dragStart(sibling.id, [sibling.id]));
    api.dispatch(dnd.hovering(api.root.id, 0));
    api.drop();

    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ dragIds: ["sibling"], parentId: null, index: 0 }),
    );
  });
});

describe("tree.filteredCount reports how many nodes match the search (#112, #256)", () => {
  // apple/apricot sit under a fruit folder; banana is a sibling leaf.
  const data = [
    { id: "fruit", children: [{ id: "apple" }, { id: "apricot" }] },
    { id: "banana" },
  ];
  // Matches a node by its own id only, so folders never count just because a
  // child matched — isolating "true match" from "ancestor kept for structure".
  const matchById = (node: NodeApi<any>, term: string) => node.id.includes(term);

  test("is 0 when there is no active search term", () => {
    expect(setupApi({ data }).filteredCount).toBe(0);
    // Whitespace-only terms are not a real search, matching isFiltered.
    expect(setupApi({ data, searchTerm: "   " }).filteredCount).toBe(0);
  });

  test("counts only matching nodes, not the ancestors kept for structure", () => {
    // "apple" and "apricot" match "ap"; the "fruit" parent is shown to keep the
    // tree intact but is not itself a match under an id-only predicate.
    const api = setupApi({ data, searchTerm: "ap", searchMatch: matchById });
    expect(api.filteredCount).toBe(2);
  });

  test("counts matches even inside collapsed folders", () => {
    // filteredCount walks the whole tree, so open/closed state doesn't change it.
    const api = setupApi({ data, searchTerm: "apple", searchMatch: matchById });
    api.close("fruit");
    expect(api.filteredCount).toBe(1);
  });

  test("is 0 when the search term matches nothing", () => {
    expect(setupApi({ data, searchTerm: "zzz" }).filteredCount).toBe(0);
  });

  test("stays consistent with the default matcher, which also matches a folder whose descendant matches", () => {
    // The default matcher stringifies each node's whole data object, children
    // included, so "fruit" counts alongside "apple" and "apricot" for "ap".
    expect(setupApi({ data, searchTerm: "ap" }).filteredCount).toBe(3);
  });
});

test("rowHeight defaults to 24", () => {
  const api = setupApi({});
  expect(api.rowHeight).toBe(24);
  expect(api.rowHeightAt(0)).toBe(24);
});

test("fixed numeric rowHeight", () => {
  const api = setupApi({ data: rowData, rowHeight: 30 });
  expect(api.rowHeight).toBe(30);
  expect(api.rowHeightAt(0)).toBe(30);
  expect(api.rowTopPosition(0)).toBe(0);
  expect(api.rowTopPosition(2)).toBe(60);
  expect(api.rowTopPosition(3)).toBe(90); // total list height
});

test("variable rowHeight function", () => {
  const heights: Record<string, number> = { a: 10, b: 20, c: 40 };
  const api = setupApi({
    data: rowData,
    rowHeight: (node) => heights[node.id],
  });
  // The back-compat getter falls back to the default for variable heights.
  expect(api.rowHeight).toBe(24);
  expect(api.rowHeightAt(0)).toBe(10);
  expect(api.rowHeightAt(1)).toBe(20);
  expect(api.rowTopPosition(0)).toBe(0);
  expect(api.rowTopPosition(1)).toBe(10);
  expect(api.rowTopPosition(2)).toBe(30);
  expect(api.rowTopPosition(3)).toBe(70); // total list height
  // Out-of-range index falls back to the default height, never an invalid 0.
  expect(api.rowHeightAt(99)).toBe(24);
});

describe("onSelect fires exactly once per selection method (#332)", () => {
  function setupWithSpy() {
    const onSelect = jest.fn();
    const api = setupApi({ data: rowData, onSelect });
    return { api, onSelect };
  }

  test("setSelection", () => {
    const { api, onSelect } = setupWithSpy();
    api.setSelection({ ids: ["a"], anchor: "a", mostRecent: "a" });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("select", () => {
    const { api, onSelect } = setupWithSpy();
    api.select("a");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("selectMulti", () => {
    const { api, onSelect } = setupWithSpy();
    api.selectMulti("a");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("selectContiguous", () => {
    const { api, onSelect } = setupWithSpy();
    api.select("a");
    onSelect.mockClear();
    api.selectContiguous("c");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("selectAll", () => {
    const { api, onSelect } = setupWithSpy();
    api.selectAll();
    expect(api.selectedIds.size).toBe(3);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("deselectAll", () => {
    const { api, onSelect } = setupWithSpy();
    api.selectAll();
    onSelect.mockClear();
    api.deselectAll();
    expect(api.selectedIds.size).toBe(0);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("deselect", () => {
    const { api, onSelect } = setupWithSpy();
    api.selectMulti("a");
    api.selectMulti("b");
    onSelect.mockClear();
    api.deselect("a");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("scrollTo brings a deeply nested node into view horizontally (#220)", () => {
  // A folder tree where "deep" sits at level 2 (indented 2 * 24 = 48px).
  const nestedData = [{ id: "root", children: [{ id: "mid", children: [{ id: "deep" }] }] }];

  // react-window's scrollToItem only scrolls vertically; the horizontal scroll
  // happens on the outer list element, which we stub here.
  function setupWithListEl(el: Partial<HTMLDivElement>) {
    const store = createStore(rootReducer);
    const list = { current: { scrollToItem: jest.fn() } as any };
    const listEl = { current: el as HTMLDivElement };
    return new TreeApi(store, { data: nestedData }, list, listEl);
  }

  test("scrolls right when the node is past the right edge", async () => {
    const el = { scrollWidth: 500, clientWidth: 40, scrollLeft: 0 };
    const api = setupWithListEl(el);
    await api.scrollTo("deep");
    // Aligns the node's indentation start (level 2 * indent 24) to the left edge.
    expect(el.scrollLeft).toBe(48);
  });

  test("scrolls left when the node is past the left edge", async () => {
    const el = { scrollWidth: 500, clientWidth: 100, scrollLeft: 200 };
    const api = setupWithListEl(el);
    await api.scrollTo("deep");
    expect(el.scrollLeft).toBe(48);
  });

  test("scrolls when the node's start sits exactly on the right edge", async () => {
    // viewRight === left (48): the visible range is half-open, so the content
    // start is already clipped and must be scrolled into view.
    const el = { scrollWidth: 500, clientWidth: 48, scrollLeft: 0 };
    const api = setupWithListEl(el);
    await api.scrollTo("deep");
    expect(el.scrollLeft).toBe(48);
  });

  test("clamps the target to the maximum scrollable distance", async () => {
    // left (48) exceeds maxScroll (60 - 40 = 20), so scrollLeft is clamped.
    const el = { scrollWidth: 60, clientWidth: 40, scrollLeft: 0 };
    const api = setupWithListEl(el);
    await api.scrollTo("deep");
    expect(el.scrollLeft).toBe(20);
  });

  test("leaves scroll untouched when the node is already in view", async () => {
    const el = { scrollWidth: 500, clientWidth: 200, scrollLeft: 0 };
    const api = setupWithListEl(el);
    await api.scrollTo("deep");
    expect(el.scrollLeft).toBe(0);
  });

  test("no-ops when the list does not overflow horizontally", async () => {
    const el = { scrollWidth: 100, clientWidth: 100, scrollLeft: 0 };
    const api = setupWithListEl(el);
    await api.scrollTo("deep");
    expect(el.scrollLeft).toBe(0);
  });
});

describe("scrollToOffset / scrollOffset set and read the vertical position (#194)", () => {
  const data = [{ id: "a" }, { id: "b" }, { id: "c" }];

  function setup(el?: Partial<HTMLDivElement>) {
    const store = createStore(rootReducer);
    const list = { current: { scrollTo: jest.fn() } as any };
    const listEl = { current: (el ?? null) as HTMLDivElement | null };
    return { api: new TreeApi(store, { data }, list, listEl), list, listEl };
  }

  test("scrollToOffset forwards the offset to the underlying list", () => {
    const { api, list } = setup();
    api.scrollToOffset(120);
    expect(list.current.scrollTo).toHaveBeenCalledWith(120);
  });

  test("scrollToOffset clamps negative offsets to the top", () => {
    const { api, list } = setup();
    api.scrollToOffset(-50);
    expect(list.current.scrollTo).toHaveBeenCalledWith(0);
  });

  test("scrollToOffset coerces non-finite offsets to the top", () => {
    const { api, list } = setup();
    api.scrollToOffset(NaN);
    api.scrollToOffset(Infinity);
    expect(list.current.scrollTo).toHaveBeenNthCalledWith(1, 0);
    expect(list.current.scrollTo).toHaveBeenNthCalledWith(2, 0);
  });

  test("scrollOffset reads the list element's scrollTop", () => {
    const { api } = setup({ scrollTop: 80 });
    expect(api.scrollOffset).toBe(80);
  });

  test("scrollOffset is 0 before the list element mounts", () => {
    const { api } = setup();
    expect(api.scrollOffset).toBe(0);
  });
});

describe("tree.hover() keeps the destination consistent with canDrop (#247)", () => {
  // box(0) > slider(1), folder2(0) > child2(1)
  const data = [
    { id: "box", children: [{ id: "slider" }] },
    { id: "folder2", children: [{ id: "child2" }] },
  ];

  test("a droppable line hover records the destination and shows the cursor", () => {
    const api = setupApi({ data });
    api.dispatch(dnd.dragStart("slider", ["slider"]));
    // Drop slider as a sibling at the root — a valid line drop.
    api.hover({ parentId: null, index: 2 }, { type: "line", index: 2, level: 0 });
    expect(api.canDrop()).toBe(true);
    expect(api.state.nodes.drag.destinationIndex).toBe(2);
    expect(api.state.dnd.cursor).toEqual({ type: "line", index: 2, level: 0 });
  });

  test("a droppable folder hover highlights it via willReceiveDrop", () => {
    const api = setupApi({ data });
    api.dispatch(dnd.dragStart("slider", ["slider"]));
    // Drop slider INTO folder2 (index null → highlight).
    api.hover({ parentId: "folder2", index: null }, { type: "highlight", id: "folder2" });
    expect(api.canDrop()).toBe(true);
    expect(api.willReceiveDrop("folder2")).toBe(true);
    expect(api.dragDestinationParent?.id).toBe("folder2");
    expect(api.state.dnd.cursor).toEqual({ type: "highlight", id: "folder2" });
  });

  test("a can't-drop hover records no destination and hides the cursor", () => {
    const api = setupApi({ data });
    // A folder can't be dropped into its own subtree.
    api.dispatch(dnd.dragStart("box", ["box"]));
    api.hover({ parentId: "box", index: null }, { type: "highlight", id: "box" });

    expect(api.canDrop()).toBe(false);
    // The consumer-facing destination and cursor all agree: "no drop here".
    expect(api.willReceiveDrop("box")).toBe(false);
    expect(api.dragDestinationParent).toBe(null);
    expect(api.state.nodes.drag.destinationParentId).toBe(null);
    expect(api.state.dnd.cursor).toEqual({ type: "none" });
    // But the drop guard still sees the real target, so a release is rejected
    // rather than falling back to a root drop.
    expect(api.state.dnd.parentId).toBe("box");
  });

  test("moving from a droppable to a can't-drop hover clears the stale destination", () => {
    const api = setupApi({ data });
    api.dispatch(dnd.dragStart("box", ["box"]));
    // Valid: drop box INTO folder2.
    api.hover({ parentId: "folder2", index: null }, { type: "highlight", id: "folder2" });
    expect(api.willReceiveDrop("folder2")).toBe(true);
    // Then slide into box's own subtree, where the drop is invalid.
    api.hover({ parentId: "box", index: null }, { type: "highlight", id: "box" });
    expect(api.willReceiveDrop("folder2")).toBe(false);
    expect(api.dragDestinationParent).toBe(null);
  });
});
