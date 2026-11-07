/**
 * Integration tests for the @dnd-kit DndContext initialisation inside
 * TreeProvider, custom sensor wiring, collision detection, and multiple
 * sibling tree rendering.
 */

import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { treeCollisionDetection } from "../components/collision-detection.js";
import { Tree } from "../components/tree.js";
import { TreeApi } from "../interfaces/tree-api.js";
import { NodeRendererProps } from "../types/renderers.js";
import { OUTER_DROP_ID } from "./outer-drop-hook.js";

type Datum = { id: string; name: string; children?: Datum[] };

const data: Datum[] = [
  { id: "1", name: "Root" },
  { id: "2", name: "Child A" },
];

/** Minimal node renderer so the tree has something to show. */
function Node({ node, dragHandle }: NodeRendererProps<Datum>) {
  return <div ref={dragHandle}>{node.data.name}</div>;
}

describe("DndProvider / DndContext integration", () => {
  test("renders tree nodes when using the default @dnd-kit setup", () => {
    render(
      <Tree<Datum> data={data} rowHeight={24}>
        {Node}
      </Tree>,
    );
    expect(screen.getByText("Root")).not.toBeNull();
    expect(screen.getByText("Child A")).not.toBeNull();
  });

  test("starts dragging when dragHandle moves beyond distance threshold", async () => {
    const handleMove = jest.fn();
    render(
      <Tree<Datum> data={data} rowHeight={24} onMove={handleMove}>
        {Node}
      </Tree>,
    );

    const rootEl = screen.getByText("Root");
    expect(rootEl).not.toBeNull();

    // Mouse drags activate on the MouseSensor's distance constraint.
    fireEvent.mouseDown(rootEl, { clientX: 10, clientY: 10, button: 0 });
    // Moving beyond distance threshold of 5px activates the drag
    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 10, clientY: 30 });
    });

    // Both the tree row and the active drag preview overlay render "Root"
    expect(screen.getAllByText("Root")).toHaveLength(2);

    // Release drag
    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 10, clientY: 30 });
    });

    // Drag ended: preview overlay unmounts, only the tree row remains
    expect(screen.getAllByText("Root")).toHaveLength(1);
  });

  test("keeps the drag alive after the source row unmounts (virtualization)", async () => {
    const many: Datum[] = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      name: `Node ${i}`,
    }));
    const ref = createRef<TreeApi<Datum> | undefined>();
    render(
      <Tree<Datum> ref={ref} data={many} rowHeight={24} height={100} width={300}>
        {Node}
      </Tree>,
    );

    fireEvent.mouseDown(screen.getByText("Node 0"), { clientX: 10, clientY: 10, button: 0 });
    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 10, clientY: 30 });
    });
    // Row plus the drag overlay.
    expect(screen.getAllByText("Node 0")).toHaveLength(2);

    // Scroll the source row out of the rendered window.
    await act(async () => {
      ref.current!.list.current!.scrollTo(2000);
    });
    expect(screen.getAllByText("Node 0")).toHaveLength(1);

    // The drag survives the unmount: it still ends cleanly.
    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 10, clientY: 30 });
    });
    expect(screen.queryByText("Node 0")).toBeNull();
  });

  test("triggers onMove when dragging and dropping a node onto another node", async () => {
    const handleMove = jest.fn();
    render(
      <Tree<Datum> data={data} rowHeight={24} onMove={handleMove}>
        {Node}
      </Tree>,
    );

    const childA = screen.getByText("Child A");
    const rootEl = screen.getByText("Root");

    const childRow = childA.closest("[role=treeitem]") as HTMLElement;
    const rootRow = rootEl.closest("[role=treeitem]") as HTMLElement;

    rootRow.getBoundingClientRect = () =>
      ({ top: 0, bottom: 24, left: 0, right: 300, width: 300, height: 24, x: 0, y: 0 }) as DOMRect;
    childRow.getBoundingClientRect = () =>
      ({
        top: 24,
        bottom: 48,
        left: 0,
        right: 300,
        width: 300,
        height: 24,
        x: 0,
        y: 24,
      }) as DOMRect;

    // Start drag on Child A
    fireEvent.mouseDown(childA, { clientX: 10, clientY: 30, button: 0 });
    await act(async () => {
      // Move up into Root row
      fireEvent.mouseMove(document, { clientX: 10, clientY: 12 });
    });

    // Drop onto Root
    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 10, clientY: 12 });
    });

    expect(handleMove).toHaveBeenCalledTimes(1);
    expect(handleMove).toHaveBeenCalledWith(
      expect.objectContaining({
        dragIds: ["2"],
      }),
    );
  });

  test("picks up a drag after disableDrag turns off", async () => {
    const { rerender } = render(
      <Tree<Datum> data={data} rowHeight={24} disableDrag>
        {Node}
      </Tree>,
    );

    /* The rows stay mounted across the re-render, so their ref callbacks do not
       run again. The listeners have to already be attached for this to work. */
    rerender(
      <Tree<Datum> data={data} rowHeight={24} disableDrag={false}>
        {Node}
      </Tree>,
    );

    fireEvent.mouseDown(screen.getByText("Root"), { clientX: 10, clientY: 10, button: 0 });
    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 10, clientY: 30 });
    });

    expect(screen.getAllByText("Root")).toHaveLength(2);

    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 10, clientY: 30 });
    });
  });

  test("a touch press and hold starts a drag", async () => {
    jest.useFakeTimers();
    try {
      render(
        <Tree<Datum> data={data} rowHeight={24}>
          {Node}
        </Tree>,
      );

      fireEvent.touchStart(screen.getByText("Root"), {
        touches: [{ clientX: 10, clientY: 10 }],
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // The overlay renders the row a second time once the drag is active.
      expect(screen.getAllByText("Root")).toHaveLength(2);

      await act(async () => {
        fireEvent.touchEnd(document, { touches: [] });
      });
    } finally {
      jest.useRealTimers();
    }
  });

  test("a touch swipe does not start a drag", async () => {
    jest.useFakeTimers();
    try {
      render(
        <Tree<Datum> data={data} rowHeight={24}>
          {Node}
        </Tree>,
      );

      fireEvent.touchStart(screen.getByText("Root"), {
        touches: [{ clientX: 10, clientY: 10 }],
      });
      await act(async () => {
        fireEvent.touchMove(screen.getByText("Root"), { touches: [{ clientX: 10, clientY: 80 }] });
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.getAllByText("Root")).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test("two sibling Trees render cleanly without singleton conflicts", () => {
    render(
      <>
        <Tree<Datum> data={data} rowHeight={24}>
          {Node}
        </Tree>
        <Tree<Datum> data={[{ id: "3", name: "Second Tree Node" }]} rowHeight={24}>
          {Node}
        </Tree>
      </>,
    );
    expect(screen.getByText("Root")).not.toBeNull();
    expect(screen.getByText("Child A")).not.toBeNull();
    expect(screen.getByText("Second Tree Node")).not.toBeNull();
  });

  test("Space and Enter on a nested button do not start a drag", () => {
    function RowWithButton({ node, dragHandle }: NodeRendererProps<Datum>) {
      return (
        <div ref={dragHandle}>
          <span>{node.data.name}</span>
          <button type="button">Action</button>
        </div>
      );
    }

    render(
      <Tree<Datum> data={data} rowHeight={24}>
        {RowWithButton}
      </Tree>,
    );

    const button = screen.getAllByRole("button")[0];
    fireEvent.keyDown(button, { key: " ", code: "Space" });
    fireEvent.keyDown(button, { key: "Enter", code: "Enter" });

    // A drag would mount the preview overlay, rendering the row text twice.
    expect(screen.getAllByText("Root")).toHaveLength(1);
  });

  test("announces pointer instructions and node names, not raw ids or Space", async () => {
    render(
      <Tree<Datum> data={data} rowHeight={24}>
        {Node}
      </Tree>,
    );

    expect(screen.getByText(/To pick up a node, press the mouse button/)).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/space bar/i);

    fireEvent.mouseDown(screen.getByText("Root"), { clientX: 10, clientY: 10, button: 0 });
    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 10, clientY: 30 });
    });

    expect(screen.getByRole("status").textContent).toBe("Picked up Root.");

    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 10, clientY: 30 });
    });
  });

  test("a pointer move over the tree does not re-render unrelated rows (#385)", async () => {
    const nested: Datum[] = [
      { id: "a", name: "Folder A", children: [{ id: "a1", name: "A1" }] },
      { id: "b", name: "Folder B", children: [{ id: "b1", name: "B1" }] },
      { id: "c", name: "Folder C", children: [{ id: "c1", name: "C1" }] },
    ];
    const renders: Record<string, number> = {};
    function CountedNode({ node, dragHandle }: NodeRendererProps<Datum>) {
      renders[node.id] = (renders[node.id] ?? 0) + 1;
      return <div ref={dragHandle}>{node.data.name}</div>;
    }

    render(
      <Tree<Datum>
        data={nested}
        rowHeight={24}
        height={200}
        width={300}
        openByDefault
        renderDragPreview={() => <div />}
      >
        {CountedNode}
      </Tree>,
    );

    const rows = screen.getAllByRole("treeitem") as HTMLElement[];
    rows.forEach((row, i) => {
      row.getBoundingClientRect = () =>
        ({
          top: i * 24,
          bottom: i * 24 + 24,
          left: 0,
          right: 300,
          width: 300,
          height: 24,
          x: 0,
          y: i * 24,
        }) as DOMRect;
    });

    fireEvent.mouseDown(screen.getByText("A1"), { clientX: 10, clientY: 36, button: 0 });
    // Each pointer move updates dnd-kit's InternalContext. Only rows whose
    // destination changed may repaint; a row in another subtree must not.
    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 10, clientY: 60 });
    });
    const before = { ...renders };

    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 10, clientY: 108 });
    });
    expect(renders.a).toBe(before.a);
    expect(renders.a1).toBe(before.a1);

    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 10, clientY: 108 });
    });
  });

  describe("treeCollisionDetection", () => {
    test("prefers row droppable collisions over outer container droppable", () => {
      const mockContainers = [
        {
          id: OUTER_DROP_ID,
          key: OUTER_DROP_ID,
          data: { current: {} },
          disabled: false,
          node: { current: null },
          rect: { current: null },
        },
        {
          id: "node-1",
          key: "node-1",
          data: { current: {} },
          disabled: false,
          node: { current: null },
          rect: { current: null },
        },
      ];
      const droppableRects = new Map([
        [OUTER_DROP_ID, { top: 0, left: 0, right: 200, bottom: 400, width: 200, height: 400 }],
        ["node-1", { top: 0, left: 0, right: 200, bottom: 40, width: 200, height: 40 }],
      ]);

      const collisions = treeCollisionDetection({
        active: null as any,
        collisionRect: null as any,
        droppableContainers: mockContainers as any,
        droppableRects: droppableRects as any,
        pointerCoordinates: { x: 50, y: 20 },
      });

      expect(collisions).toHaveLength(1);
      expect(collisions[0].id).toBe("node-1");
    });

    test("falls back to outer container when hovering in empty list space", () => {
      const mockContainers = [
        {
          id: OUTER_DROP_ID,
          key: OUTER_DROP_ID,
          data: { current: {} },
          disabled: false,
          node: { current: null },
          rect: { current: null },
        },
        {
          id: "node-1",
          key: "node-1",
          data: { current: {} },
          disabled: false,
          node: { current: null },
          rect: { current: null },
        },
      ];
      const droppableRects = new Map([
        [OUTER_DROP_ID, { top: 0, left: 0, right: 200, bottom: 400, width: 200, height: 400 }],
        ["node-1", { top: 0, left: 0, right: 200, bottom: 40, width: 200, height: 40 }],
      ]);

      const collisions = treeCollisionDetection({
        active: null as any,
        collisionRect: null as any,
        droppableContainers: mockContainers as any,
        droppableRects: droppableRects as any,
        pointerCoordinates: { x: 50, y: 150 }, // below node-1, within list
      });

      expect(collisions).toHaveLength(1);
      expect(collisions[0].id).toBe(OUTER_DROP_ID);
    });

    test("returns empty array when pointer is outside all droppables", () => {
      const droppableRects = new Map([
        [OUTER_DROP_ID, { top: 0, left: 0, right: 200, bottom: 400, width: 200, height: 400 }],
      ]);
      const collisions = treeCollisionDetection({
        active: null as any,
        collisionRect: null as any,
        droppableContainers: [
          {
            id: OUTER_DROP_ID,
            key: OUTER_DROP_ID,
            data: { current: {} },
            disabled: false,
            node: { current: null },
            rect: { current: null },
          },
        ] as any,
        droppableRects: droppableRects as any,
        pointerCoordinates: { x: 500, y: 500 },
      });

      expect(collisions).toEqual([]);
    });
  });
});
