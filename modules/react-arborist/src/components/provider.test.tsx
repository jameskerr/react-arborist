import { createRef } from "react";
import { act, render } from "@testing-library/react";
import { Tree } from "./tree";
import { TreeApi } from "../interfaces/tree-api";

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
  render(
    <Tree<Datum>
      data={data}
      ref={ref}
      rowHeight={24}
      openByDefault={false}
    />
  );
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
