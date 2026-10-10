/**
 * Integration tests for the three DndProvider initialisation paths inside
 * TreeProvider, and regression coverage for the react-dnd global-singleton
 * conflict (GitHub issue #319).
 *
 * Background
 * ----------
 * react-dnd ≤ v14 was shipped as a bundled *dependency* of react-arborist,
 * which caused two independent copies of react-dnd to be loaded whenever the
 * host application also depended on react-dnd (at any version). Because
 * react-dnd initialises a global singleton via
 *   window[Symbol.for('__REACT_DND_CONTEXT_INSTANCE__')]
 * the two copies pointed at different singletons, so the host's DndProvider
 * and react-arborist's internal DndProvider never shared a backend/manager.
 * Drag-and-drop across the boundary silently failed; on some react-dnd
 * versions the HTML5Backend threw "Cannot have two HTML5 backends at the
 * same time."
 *
 * The fix (v4) promotes react-dnd to a *peer dependency* so that only one
 * copy is ever resolved.  These tests verify:
 *   1. The default path (HTML5Backend, no props) renders the tree.
 *   2. A custom `dndBackend` prop is wired through correctly.
 *   3. A shared external DndProvider + `dndManager` prop works (the pattern
 *      required when react-arborist sits alongside other react-dnd consumers).
 *   4. Two sibling <Tree> instances both resolve to one external DndProvider's
 *      manager — regression guard for #319.
 */

import { render, screen } from "@testing-library/react";
import { DndProvider, useDragDropManager } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { getDndProviderProps } from "../components/get-dnd-provider-props.js";
import { Tree } from "../components/tree.js";
import { TreeProps } from "../types/tree-props.js";

/* ------------------------------------------------------------------ */
/* Shared fixtures                                                       */
/* ------------------------------------------------------------------ */

type Datum = { id: string; name: string; children?: Datum[] };
type Manager = ReturnType<typeof useDragDropManager>;

const data: Datum[] = [
  { id: "1", name: "Root" },
  { id: "2", name: "Child A" },
];

/** Minimal node renderer so the tree has something to show. */
function Node({ node }: { node: { data: Datum } }) {
  return <span>{node.data.name}</span>;
}

/*
 * react-dnd v16 memoises one manager per context object, and for the default
 * `backend` path that object is the global — so every <Tree> in a single jsdom
 * window shares a manager whether or not `dndManager` is threaded through.
 * Giving the external provider its own `context` keeps its manager off the
 * global slot, so identity assertions below fail if the prop is dropped.
 * HTML5Backend can't run against a non-window context, hence the stub.
 */
const isolatedContext = {};
const noop = () => {};
const StubBackend: NonNullable<TreeProps<Datum>["dndBackend"]> = () => ({
  setup: noop,
  teardown: noop,
  connectDragSource: () => noop,
  connectDragPreview: () => noop,
  connectDropTarget: () => noop,
  profile: () => ({}),
});

/** Rendered inside each <Tree>, so it observes that tree's own manager. */
const managersInsideTrees: Manager[] = [];
function ProbeNode({ node }: { node: { data: Datum } }) {
  managersInsideTrees.push(useDragDropManager());
  return <span>{node.data.name}</span>;
}

let externalManager: Manager | undefined;
function CaptureManager() {
  externalManager = useDragDropManager();
  return null;
}

function expectTreesUsedExternalManager() {
  expect(managersInsideTrees.length).toBeGreaterThan(0);
  // Counted rather than asserted per manager: `toBe` on a mismatch makes Jest
  // deep-copy the whole manager/store graph to build a diff and run out of heap.
  const foreign = managersInsideTrees.filter((manager) => manager !== externalManager);
  expect(foreign.length).toBe(0);
}

beforeEach(() => {
  managersInsideTrees.length = 0;
  externalManager = undefined;
});

/* ------------------------------------------------------------------ */
/* 1. Default path — HTML5Backend is auto-wired                         */
/* ------------------------------------------------------------------ */

test("renders tree nodes when using the default HTML5Backend", () => {
  render(
    <Tree<Datum> data={data} rowHeight={24}>
      {Node}
    </Tree>,
  );
  expect(screen.getByText("Root")).not.toBeNull();
  expect(screen.getByText("Child A")).not.toBeNull();
});

/* ------------------------------------------------------------------ */
/* 2. Custom dndBackend prop                                             */
/* ------------------------------------------------------------------ */

test("accepts a custom dndBackend and still renders tree nodes", () => {
  /* HTML5Backend is used as the custom backend here; any Backend would work. */
  render(
    <Tree<Datum> data={data} rowHeight={24} dndBackend={HTML5Backend}>
      {Node}
    </Tree>,
  );
  expect(screen.getByText("Root")).not.toBeNull();
});

/*
 * The render test above passes even if `dndBackend` is ignored entirely,
 * since react-dnd v16 resolves every default-context <Tree> to the same
 * global manager regardless of which backend was requested. These assert
 * directly on the prop-resolution function so a dropped `dndBackend`
 * actually fails a test.
 */
test("forwards a custom dndBackend to DndProvider", () => {
  expect(
    getDndProviderProps({ data, dndBackend: StubBackend } as TreeProps<Datum>, undefined),
  ).toEqual({ backend: StubBackend, options: { rootElement: undefined } });
});

test("falls back to HTML5Backend when no dndBackend is given", () => {
  expect(getDndProviderProps({ data } as TreeProps<Datum>, undefined)).toEqual({
    backend: HTML5Backend,
    options: { rootElement: undefined },
  });
});

test("dndManager takes precedence over dndBackend", () => {
  const manager = {} as NonNullable<TreeProps<Datum>["dndManager"]>;
  expect(
    getDndProviderProps(
      { data, dndManager: manager, dndBackend: StubBackend } as TreeProps<Datum>,
      undefined,
    ),
  ).toEqual({ manager });
});

/* ------------------------------------------------------------------ */
/* 3. Shared external DndProvider + dndManager prop                     */
/* ------------------------------------------------------------------ */

/**
 * This is the correct pattern when react-arborist coexists with other
 * react-dnd consumers in the same application.  One DndProvider owns the
 * backend; its manager is passed to the tree so both share the same context.
 *
 * Without it, the tree resolves through the global context instead — a
 * different manager whenever the provider carries its own `context`, which is
 * how this file forces the distinction to be observable.
 */
function SharedProviderSetup() {
  const manager = useDragDropManager();
  return (
    <Tree<Datum> data={data} rowHeight={24} dndManager={manager}>
      {ProbeNode}
    </Tree>
  );
}

test("renders correctly when dndManager from an external DndProvider is passed", () => {
  render(
    <DndProvider backend={StubBackend} context={isolatedContext}>
      <CaptureManager />
      <SharedProviderSetup />
    </DndProvider>,
  );
  expect(screen.getByText("Root")).not.toBeNull();
  expect(screen.getByText("Child A")).not.toBeNull();
  expectTreesUsedExternalManager();
});

/* ------------------------------------------------------------------ */
/* 4. Singleton conflict regression — two sibling Trees, one backend    */
/* ------------------------------------------------------------------ */

/**
 * Regression test for GitHub issue #319.
 *
 * Before v4, react-arborist bundled its own copy of react-dnd, so the host's
 * DndProvider and the tree's internal one initialised *different* global
 * singletons — the two-copies problem described at the top of this file.
 *
 * Note what this does and does not cover.  As the fixture comment above
 * explains, sibling trees on the default (global) context already share one
 * manager and one backend, so #319 cannot recur through that path.  What is
 * still worth guarding is the explicit binding: with the provider on its own
 * `context`, both trees have to resolve to *its* manager, which only happens
 * if `dndManager` is honoured.
 */
function SiblingTrees() {
  const manager = useDragDropManager();
  return (
    <>
      <Tree<Datum> data={data} rowHeight={24} dndManager={manager}>
        {ProbeNode}
      </Tree>
      <Tree<Datum>
        data={[{ id: "3", name: "Second Tree Node" }]}
        rowHeight={24}
        dndManager={manager}
      >
        {ProbeNode}
      </Tree>
    </>
  );
}

test("two sibling Trees sharing one DndProvider do not conflict (#319)", () => {
  render(
    <DndProvider backend={StubBackend} context={isolatedContext}>
      <CaptureManager />
      <SiblingTrees />
    </DndProvider>,
  );
  expect(screen.getByText("Root")).not.toBeNull();
  expect(screen.getByText("Child A")).not.toBeNull();
  expect(screen.getByText("Second Tree Node")).not.toBeNull();
  expectTreesUsedExternalManager();
});
