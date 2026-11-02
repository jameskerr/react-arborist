import { createRef, useLayoutEffect } from "react";
import { act, render } from "@testing-library/react";
import { Tree } from "../components/tree.js";
import type { TreeApi } from "../interfaces/tree-api.js";
import { initialState } from "./initial.js";
import { actions, reducer } from "./selection-slice.js";

type Datum = { id: string; name: string };
const data: Datum[] = [
  { id: "a", name: "a" },
  { id: "b", name: "b" },
];

/* A parent's layout effect runs before the provider's passive mount effect
   (which resets selection via deselectAll), so this add lands on the store's
   initial selection Set. */
test("selecting from a parent layout effect does not leak into later initial state", async () => {
  function SelectOnMount() {
    const ref = createRef<TreeApi<Datum> | undefined>();
    useLayoutEffect(() => {
      ref.current!.selectMulti("a", { focus: false });
    }, []);
    return <Tree<Datum> data={data} ref={ref} />;
  }

  const { unmount } = render(<SelectOnMount />);
  await act(async () => {});
  unmount();

  expect(initialState().nodes.selection.ids.has("a")).toBe(false);
});

test("each initialState() call gets its own selection Set", () => {
  expect(initialState().nodes.selection.ids).not.toBe(initialState().nodes.selection.ids);
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
