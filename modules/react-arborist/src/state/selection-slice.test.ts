import { actions, reducer } from "./selection-slice.js";

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
