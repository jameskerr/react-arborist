import { createStore } from "redux";
import { TreeApi } from "../interfaces/tree-api.js";
import type { TreeProps } from "../types/tree-props.js";
import { rootReducer } from "./root-reducer.js";
import { actions, reducer } from "./selection-slice.js";

function setupApi(props: TreeProps<any>) {
  const store = createStore(rootReducer);
  return new TreeApi(store, props, { current: null }, { current: null });
}

const data = [{ id: "a" }, { id: "b" }];

test("a captured selectedIds Set stays stable after a later selectMulti", () => {
  const api = setupApi({ data });
  api.select("a");
  const captured = api.selectedIds;
  api.selectMulti("b");
  expect(captured.has("a")).toBe(true);
  expect(captured.has("b")).toBe(false);
  expect(api.selectedIds.has("a")).toBe(true);
  expect(api.selectedIds.has("b")).toBe(true);
});

test("SELECTION_ADD does not mutate the previous state's ids", () => {
  const before = { ids: new Set<string>(), anchor: null, mostRecent: null };
  reducer(before, actions.add("a"));
  expect(before.ids.has("a")).toBe(false);
});

test("SELECTION_REMOVE does not mutate the previous state's ids", () => {
  const before = { ids: new Set(["a"]), anchor: null, mostRecent: null };
  reducer(before, actions.remove("a"));
  expect(before.ids.has("a")).toBe(true);
});
