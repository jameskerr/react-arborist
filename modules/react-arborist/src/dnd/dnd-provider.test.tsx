/**
 * Integration tests for the @dnd-kit DndContext initialisation inside
 * TreeProvider, custom sensor wiring, collision detection, and multiple
 * sibling tree rendering.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  DndContext as DndKitContext,
  KeyboardSensor,
  SensorDescriptor,
  SensorOptions,
} from "@dnd-kit/core";
import {
  getDefaultSensors,
  getDndProviderProps,
  treeCollisionDetection,
} from "../components/get-dnd-provider-props.js";
import { Tree } from "../components/tree.js";
import { TreeProps } from "../types/tree-props.js";
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

  test("accepts deprecated dndBackend and dndManager props without error", () => {
    render(
      <Tree<Datum> data={data} rowHeight={24} dndBackend={() => ({})} dndManager={{}}>
        {Node}
      </Tree>,
    );
    expect(screen.getByText("Root")).not.toBeNull();
  });

  test("starts dragging when dragHandle moves beyond distance threshold", () => {
    const handleMove = jest.fn();
    render(
      <Tree<Datum> data={data} rowHeight={24} onMove={handleMove}>
        {Node}
      </Tree>,
    );

    const rootEl = screen.getByText("Root");
    expect(rootEl).not.toBeNull();

    // In jsdom without PointerEvent, MouseSensor is used
    fireEvent.mouseDown(rootEl, { clientX: 10, clientY: 10, button: 0 });
    // Moving beyond distance threshold of 5px activates the drag
    act(() => {
      fireEvent.mouseMove(document, { clientX: 10, clientY: 30 });
    });

    // Both the tree row and the active drag preview overlay render "Root"
    expect(screen.getAllByText("Root")).toHaveLength(2);

    // Release drag
    act(() => {
      fireEvent.mouseUp(document, { clientX: 10, clientY: 30 });
    });

    // Drag ended: preview overlay unmounts, only the tree row remains
    expect(screen.getAllByText("Root")).toHaveLength(1);
  });

  test("triggers onMove when dragging and dropping a node onto another node", () => {
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
    act(() => {
      // Move up into Root row
      fireEvent.mouseMove(document, { clientX: 10, clientY: 12 });
    });

    // Drop onto Root
    act(() => {
      fireEvent.mouseUp(document, { clientX: 10, clientY: 12 });
    });

    expect(handleMove).toHaveBeenCalledTimes(1);
    expect(handleMove).toHaveBeenCalledWith(
      expect.objectContaining({
        dragIds: ["2"],
      }),
    );
  });

  test("participates in an external @dnd-kit DndContext without nesting errors", () => {
    const handleDragStart = jest.fn();
    render(
      <DndKitContext sensors={getDefaultSensors()} onDragStart={handleDragStart}>
        <Tree<Datum> data={data} rowHeight={24}>
          {Node}
        </Tree>
      </DndKitContext>,
    );

    const rootEl = screen.getByText("Root");
    expect(rootEl).not.toBeNull();

    fireEvent.mouseDown(rootEl, { clientX: 10, clientY: 10, button: 0 });
    act(() => {
      fireEvent.mouseMove(document, { clientX: 10, clientY: 30 });
    });

    expect(handleDragStart).toHaveBeenCalledTimes(1);

    act(() => {
      fireEvent.mouseUp(document, { clientX: 10, clientY: 30 });
    });
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

  test("forwards custom sensors to getDndProviderProps", () => {
    const customSensors: SensorDescriptor<SensorOptions>[] = [
      { sensor: KeyboardSensor, options: {} },
    ];
    const props = getDndProviderProps({ data, sensors: customSensors } as TreeProps<Datum>);
    expect(props.sensors).toBe(customSensors);
    expect(props.collisionDetection).toBe(treeCollisionDetection);
  });

  test("resolves default sensors when no custom sensors given", () => {
    const props = getDndProviderProps({ data } as TreeProps<Datum>);
    expect(props.sensors).toBeUndefined();
    const defaults = getDefaultSensors();
    expect(defaults).toHaveLength(2);
    expect(defaults[1].sensor).toBe(KeyboardSensor);
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
