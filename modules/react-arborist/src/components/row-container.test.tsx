import { createRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { Tree } from "./tree.js";
import { useSimpleTree } from "../hooks/use-simple-tree.js";
import { TreeApi } from "../interfaces/tree-api.js";
import { actions as dnd } from "../state/dnd-slice.js";
import { NodeRendererProps } from "../types/renderers.js";

type Datum = { id: string; name: string; children?: Datum[] };

const data: Datum[] = [
  { id: "a", name: "a", children: [{ id: "a1", name: "a1" }] },
  { id: "b", name: "b", children: [{ id: "b1", name: "b1" }] },
  { id: "c", name: "c", children: [{ id: "c1", name: "c1" }] },
];

// A drag hovers a new folder many times over its lifetime. Every one of those
// destination changes used to invalidate the whole nodes state, which every row
// consumes, so all of them re-rendered along with their (arbitrarily expensive)
// custom node renderer. A row reads the destination through its own place in the
// tree — willReceiveDrop, or dragDestinationParent.isAncestorOf(node) to
// highlight the target subtree — so the rows inside it still have to repaint.
test("a drop destination change only re-renders the rows it affects", () => {
  const renders: Record<string, number> = {};
  function Node({ node }: NodeRendererProps<Datum>) {
    renders[node.id] = (renders[node.id] ?? 0) + 1;
    return <div>{node.data.name}</div>;
  }

  const ref = createRef<TreeApi<Datum> | undefined>();
  render(
    <Tree<Datum> data={data} ref={ref} openByDefault>
      {Node}
    </Tree>,
  );
  const api = ref.current!;
  expect(Object.keys(renders).sort()).toEqual(["a", "a1", "b", "b1", "c", "c1"]);

  let before = { ...renders };
  act(() => {
    api.dispatch(dnd.setDestination("b", null));
  });
  expect(api.willReceiveDrop("b")).toBe(true);
  expect(renders).toEqual({ ...before, b: before.b + 1, b1: before.b1 + 1 });

  // Moving the destination repaints the subtree that loses it and the one that
  // gains it — and nothing else.
  before = { ...renders };
  act(() => {
    api.dispatch(dnd.setDestination("a", null));
  });
  expect(renders).toEqual({
    ...before,
    a: before.a + 1,
    a1: before.a1 + 1,
    b: before.b + 1,
    b1: before.b1 + 1,
  });

  // A new index within the same parent still moves the destination for the rows
  // in it, e.g. for an insertion marker.
  before = { ...renders };
  act(() => {
    api.dispatch(dnd.setDestination("a", 1));
  });
  expect(renders).toEqual({ ...before, a: before.a + 1, a1: before.a1 + 1 });

  // An unchanged destination is not a state change at all.
  before = { ...renders };
  act(() => {
    api.dispatch(dnd.setDestination("a", 1));
  });
  expect(renders).toEqual(before);
});

// A line drop between top-level rows has no parent row (destinationParentId is
// null), but a custom renderer can still draw a root insertion marker from
// dragDestinationIndex, so every row has to see the index move.
test("a root-level drop destination change re-renders every row", () => {
  const renders: Record<string, number> = {};
  function Node({ node }: NodeRendererProps<Datum>) {
    renders[node.id] = (renders[node.id] ?? 0) + 1;
    return <div>{node.data.name}</div>;
  }

  const ref = createRef<TreeApi<Datum> | undefined>();
  render(
    <Tree<Datum> data={data} ref={ref} openByDefault>
      {Node}
    </Tree>,
  );
  const api = ref.current!;
  const all = (before: Record<string, number>) =>
    Object.fromEntries(Object.entries(before).map(([id, n]) => [id, n + 1]));

  let before = { ...renders };
  act(() => {
    api.dispatch(dnd.setDestination(null, 1));
  });
  expect(renders).toEqual(all(before));

  before = { ...renders };
  act(() => {
    api.dispatch(dnd.setDestination(null, 2));
  });
  expect(renders).toEqual(all(before));

  // Clearing the destination is a change for every row too.
  before = { ...renders };
  act(() => {
    api.dispatch(dnd.setDestination(null, null));
  });
  expect(renders).toEqual(all(before));
});

test('a root-level destination and a node with id "null" are different destinations', () => {
  const renders: Record<string, number> = {};
  function Node({ node }: NodeRendererProps<Datum>) {
    renders[node.id] = (renders[node.id] ?? 0) + 1;
    return <div>{node.data.name}</div>;
  }

  const ref = createRef<TreeApi<Datum> | undefined>();
  render(
    <Tree<Datum>
      data={[{ id: "null", name: "null", children: [{ id: "x", name: "x" }] }]}
      ref={ref}
      openByDefault
    >
      {Node}
    </Tree>,
  );
  const api = ref.current!;
  act(() => {
    api.dispatch(dnd.setDestination(null, 1));
  });
  const before = { ...renders };
  act(() => {
    api.dispatch(dnd.setDestination("null", 1));
  });
  expect(renders).toEqual({ null: before.null + 1, x: before.x + 1 });
});

test("useSimpleTree rename of a child refreshes the folder's node.children", () => {
  function FolderChildNames({ node, dragHandle }: NodeRendererProps<Datum>) {
    const kids = node.children?.map((c) => c.data.name).join(",") ?? "";
    return (
      <div ref={dragHandle} data-testid={node.id}>
        {node.data.name}|{kids}
      </div>
    );
  }

  const ref = createRef<TreeApi<Datum> | undefined>();
  function App() {
    const [treeData, handlers] = useSimpleTree<Datum>([
      { id: "f", name: "folder", children: [{ id: "c", name: "child" }] },
    ]);
    return (
      <Tree<Datum> ref={ref} data={treeData} {...handlers} openByDefault>
        {FolderChildNames}
      </Tree>
    );
  }

  render(<App />);
  act(() => {
    ref.current!.props.onRename!({ id: "c", name: "renamed", node: ref.current!.get("c")! });
  });
  expect(screen.getByTestId("f").textContent).toBe("folder|renamed");
});
