import { createRef } from "react";
import { act, render } from "@testing-library/react";
import { Tree } from "../components/tree.js";
import { TreeApi } from "../interfaces/tree-api.js";
import { NodeRendererProps } from "../types/renderers.js";

type Datum = { id: string; name: string; children?: Datum[] };

/* A row's clone keeps the rowIndex of the rebuild it was cloned in. Opening a
   folder above the row moves it without changing its state, data or level, so
   without rowIndex in the memo deps the clone's prev/next still point at the
   rows around its old position. */
test("a row clone follows the row when a folder above it opens", () => {
  const seen: Record<string, string | null> = {};
  function Recorder({ node, dragHandle }: NodeRendererProps<Datum>) {
    seen[node.id] = node.prev?.id ?? null;
    return <div ref={dragHandle}>{node.data.name}</div>;
  }

  const ref = createRef<TreeApi<Datum> | undefined>();
  render(
    <Tree<Datum>
      ref={ref}
      openByDefault={false}
      data={[
        { id: "f", name: "folder", children: [{ id: "c1", name: "c1" }] },
        { id: "x", name: "x" },
      ]}
    >
      {Recorder}
    </Tree>,
  );

  expect(seen.x).toBe("f");

  act(() => ref.current!.open("f"));

  expect(seen.x).toBe("c1");
});
