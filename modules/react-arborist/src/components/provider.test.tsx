import { createRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { FixedSizeList, VariableSizeList } from "react-window";
import { Tree } from "./tree";
import { TreeApi } from "../interfaces/tree-api";
import { NodeApi } from "../interfaces/node-api";

type Datum = { id: string; name: string; children?: Datum[] };

const data: Datum[] = [
  {
    id: "1",
    name: "root",
    children: [
      { id: "2", name: "a" },
      { id: "3", name: "b", children: [{ id: "4", name: "c" }] },
    ],
  },
];

test("imperative tree.update() props survive node toggles (#228)", () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> data={data} ref={ref} rowHeight={24} openByDefault={false} />);
  const api = ref.current!;
  expect(api.rowHeight).toBe(24);

  act(() => {
    api.update({ ...api.props, rowHeight: 48 });
  });
  expect(api.rowHeight).toBe(48);

  /* Opening a node dispatches a redux action that changes state.nodes.open.
     Before #337, the open-state effect re-ran api.update(treeProps), reverting
     rowHeight to 24. */
  act(() => {
    api.open("1");
  });
  expect(api.rowHeight).toBe(48);
});

/* Backwards compatibility: switching FixedSizeList -> VariableSizeList must not
   change layout for a numeric rowHeight. With openByDefault, all four nodes
   (1 > 2, 3 > 4) are visible in DFS order. */
test("numeric rowHeight positions rows at index * height (#238 back-compat)", () => {
  render(<Tree<Datum> data={data} rowHeight={24} openByDefault />);
  const rows = screen.getAllByRole("treeitem");
  expect(rows).toHaveLength(4);
  rows.forEach((row, i) => {
    expect(row.style.height).toBe("24px");
    expect(row.style.top).toBe(`${i * 24}px`);
  });
});

test("function rowHeight gives each row its own height and cumulative top (#238)", () => {
  const heights: Record<string, number> = { "1": 40, "2": 20, "3": 30, "4": 10 };
  render(<Tree<Datum> data={data} rowHeight={(node) => heights[node.id]} openByDefault />);
  const rows = screen.getAllByRole("treeitem");
  expect(rows).toHaveLength(4);
  const expected = [40, 20, 30, 10];
  let top = 0;
  rows.forEach((row, i) => {
    expect(row.style.height).toBe(`${expected[i]}px`);
    expect(row.style.top).toBe(`${top}px`);
    top += expected[i];
  });
});

test("mutations tell the list to recompute heights (#238)", () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  /* Only variable-height mode renders a VariableSizeList with a measurement
     cache to recompute, so use a function rowHeight here. */
  render(<Tree<Datum> data={data} ref={ref} rowHeight={() => 24} openByDefault />);
  const api = ref.current!;
  const reset = jest.spyOn(api.list.current as VariableSizeList, "resetAfterIndex");

  act(() => api.close("1"));
  expect(reset).toHaveBeenCalled();

  reset.mockClear();
  act(() => api.open("1"));
  expect(reset).toHaveBeenCalled();
});

/* react-window caches measurements by index and never invalidates them itself.
   When data changes via props in variable-height mode, those cached sizes belong
   to the wrong rows, so update() must drop the cache. It runs during render, so
   it uses the shouldForceUpdate=false variant. */
test("changing data in variable-height mode resets the list cache (#238)", () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  const rowHeight = (node: NodeApi<Datum>) => (node.isInternal ? 40 : 20);
  const { rerender } = render(
    <Tree<Datum> data={data} ref={ref} rowHeight={rowHeight} openByDefault />,
  );
  const reset = jest.spyOn(ref.current!.list.current as VariableSizeList, "resetAfterIndex");

  const nextData: Datum[] = [{ id: "9", name: "fresh" }, ...data];
  act(() => {
    rerender(<Tree<Datum> data={nextData} ref={ref} rowHeight={rowHeight} openByDefault />);
  });

  expect(reset).toHaveBeenCalledWith(0, false);
});

/* The numeric path must stay on FixedSizeList: it has constant item sizes, so
   there is no measurement cache to go stale and none of VariableSizeList's
   overhead. A FixedSizeList has no resetAfterIndex method at all. */
test("numeric rowHeight renders a cache-free FixedSizeList (#238)", () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> data={data} ref={ref} rowHeight={24} openByDefault />);
  const list = ref.current!.list.current!;
  expect(list).toBeInstanceOf(FixedSizeList);
  expect("resetAfterIndex" in list).toBe(false);
});

/* The function path uses VariableSizeList so per-row heights are possible. */
test("function rowHeight renders a VariableSizeList (#238)", () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> data={data} ref={ref} rowHeight={() => 24} openByDefault />);
  expect(ref.current!.list.current!).toBeInstanceOf(VariableSizeList);
});
