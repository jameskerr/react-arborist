import { createStore } from "redux";
import { rootReducer } from "../state/root-reducer";
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
