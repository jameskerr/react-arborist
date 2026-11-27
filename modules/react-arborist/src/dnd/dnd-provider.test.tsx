/**
 * Integration tests for the @dnd-kit DndContext initialisation inside
 * TreeProvider, custom sensor wiring, collision detection, and multiple
 * sibling tree rendering.
 */

import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useSensor, useSensors } from "@dnd-kit/core";
import type { Activators, SensorInstance, SensorOptions, SensorProps } from "@dnd-kit/core";
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
    const ref = createRef<TreeApi<Datum> | undefined>();
    render(
      <Tree<Datum> ref={ref} data={data} rowHeight={24} onMove={handleMove}>
        {Node}
      </Tree>,
    );

    /* Collision detection ignores rows outside the scroll container, and jsdom
       measures every element as 0x0 unless it is stubbed. */
    ref.current!.listEl.current!.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 48,
        left: 0,
        right: 300,
        width: 300,
        height: 48,
        x: 0,
        y: 0,
      }) as DOMRect;

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

    /* One button per row. */
    const button = screen.getAllByText("Action")[0];
    fireEvent.keyDown(button, { key: " ", code: "Space" });
    fireEvent.keyDown(button, { key: "Enter", code: "Enter" });

    // A drag would mount the preview overlay, rendering the row text twice.
    expect(screen.getAllByText("Root")).toHaveLength(1);
  });

  test("puts dnd-kit's aria-describedby on draggable rows without overriding treeitem semantics", () => {
    const { rerender } = render(
      <Tree<Datum> data={data} rowHeight={24} disableDrag={false}>
        {Node}
      </Tree>,
    );

    const row = screen.getByText("Root").closest("[role=treeitem]")!;
    /* Without aria-describedby the screen-reader instructions are rendered but
       never referenced from the draggable, so they are never read. */
    const describedBy = row.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).not.toBeNull();

    /* The row keeps its own role and roving tabindex; dnd-kit's button role,
       tabIndex=0, aria-roledescription, and aria-disabled would override
       treeitem semantics or announce non-draggable rows as disabled. */
    expect(row.getAttribute("role")).toBe("treeitem");
    expect(row.getAttribute("tabindex")).toBe("-1");
    expect(row.hasAttribute("aria-roledescription")).toBe(false);
    expect(row.hasAttribute("aria-disabled")).toBe(false);
    expect(screen.getByText("Root").hasAttribute("role")).toBe(false);

    /* When a row can't drag, omit aria-describedby and keep aria-disabled off
       so the treeitem stays announced as an active item. */
    rerender(
      <Tree<Datum> data={data} rowHeight={24} disableDrag>
        {Node}
      </Tree>,
    );
    expect(row.hasAttribute("aria-describedby")).toBe(false);
    expect(row.hasAttribute("aria-roledescription")).toBe(false);
    expect(row.hasAttribute("aria-disabled")).toBe(false);
  });

  test("sets touch-action only on rows that can drag", () => {
    const { rerender } = render(
      <Tree<Datum> data={data} rowHeight={24} disableDrag>
        {Node}
      </Tree>,
    );
    expect(screen.getByText("Root").style.touchAction).not.toBe("manipulation");

    /* The row stays mounted across this re-render, so the ref callback has to
       run again for the gesture to work. */
    rerender(
      <Tree<Datum> data={data} rowHeight={24} disableDrag={false}>
        {Node}
      </Tree>,
    );
    expect(screen.getByText("Root").style.touchAction).toBe("manipulation");
  });

  test("leaves a consumer's own touch-action alone", () => {
    function TouchNode({ node, dragHandle }: NodeRendererProps<Datum>) {
      return (
        <div ref={dragHandle} style={{ touchAction: "none" }}>
          {node.data.name}
        </div>
      );
    }

    render(
      <Tree<Datum> data={data} rowHeight={24}>
        {TouchNode}
      </Tree>,
    );
    expect(screen.getByText("Root").style.touchAction).toBe("none");
  });

  test("binds a custom sensor's activator event", async () => {
    /* A long-press sensor might activate on contextmenu, which is outside the
       built-in pointer/mouse/touch list. The real MouseSensor's activator type
       is narrowed to onMouseDown, so this stands in as a minimal sensor. */
    class ContextMenuSensor implements SensorInstance {
      static activators: Activators<SensorOptions> = [
        { eventName: "onContextMenu", handler: () => true },
      ];
      autoScrollEnabled = false;

      constructor({ onStart, onEnd }: SensorProps<SensorOptions>) {
        onStart({ x: 0, y: 0 });
        document.addEventListener("mouseup", () => onEnd(), { once: true });
      }
    }

    function ContextMenuTree() {
      const sensors = useSensors(useSensor(ContextMenuSensor));
      return (
        <Tree<Datum> data={data} rowHeight={24} sensors={sensors}>
          {Node}
        </Tree>
      );
    }

    render(<ContextMenuTree />);

    await act(async () => {
      fireEvent.contextMenu(screen.getByText("Root"));
    });

    // The overlay renders the row a second time once the drag is active.
    expect(screen.getAllByText("Root")).toHaveLength(2);

    await act(async () => {
      fireEvent.mouseUp(document);
    });
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

    test("ignores a row that sticks out beyond the scroll container", () => {
      const droppableRects = new Map([
        [OUTER_DROP_ID, { top: 0, left: 0, right: 200, bottom: 400, width: 200, height: 400 }],
        // The overscan row sits above the visible list.
        ["node-0", { top: -40, left: 0, right: 200, bottom: 0, width: 200, height: 40 }],
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
          {
            id: "node-0",
            key: "node-0",
            data: { current: {} },
            disabled: false,
            node: { current: null },
            rect: { current: null },
          },
        ] as any,
        droppableRects: droppableRects as any,
        // Inside the row's rect, but above the list the user can see.
        pointerCoordinates: { x: 50, y: -10 },
      });

      expect(collisions).toEqual([]);
    });

    test("keeps a row collision when the pointer is inside the list", () => {
      const droppableRects = new Map([
        [OUTER_DROP_ID, { top: 0, left: 0, right: 200, bottom: 400, width: 200, height: 400 }],
        ["node-1", { top: 0, left: 0, right: 200, bottom: 40, width: 200, height: 40 }],
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
          {
            id: "node-1",
            key: "node-1",
            data: { current: {} },
            disabled: false,
            node: { current: null },
            rect: { current: null },
          },
        ] as any,
        droppableRects: droppableRects as any,
        pointerCoordinates: { x: 50, y: 10 },
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
