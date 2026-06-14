import { createStore } from "redux";
import { rootReducer } from "../state/root-reducer";
import { actions as dnd } from "../state/dnd-slice";
import { TreeProps } from "../types/tree-props";
import { TreeApi } from "./tree-api";

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
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: "folder", index: 0 }),
    );
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
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ["a"] }),
    );
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
