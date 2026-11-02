import { act, renderHook } from "@testing-library/react";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import type { Store } from "redux";
import type { NodeApi } from "../interfaces/node-api.js";
import type { TreeApi } from "../interfaces/tree-api.js";
import type { Actions, RootState } from "../state/root-reducer.js";
import { useDragHandlers } from "./use-drag-handlers.js";

/* A single leaf row at the top of the list. The maths only reads these members,
   so a minimal stub stands in for a real NodeApi. */
function setup() {
  const root = { id: "root", level: 0, children: [] as NodeApi[] };
  const parent = { id: "p", level: 0, parent: root, children: [] as NodeApi[] };
  const node = {
    id: "a",
    level: 1,
    isLeaf: true,
    isInternal: false,
    parent,
    children: [],
    prev: null,
    next: null,
    rowIndex: 0,
  } as unknown as NodeApi;
  parent.children.push(node);
  root.children.push(parent as unknown as NodeApi);

  /* Half of the row: y below 10 is the top half. */
  const element = { getBoundingClientRect: () => ({ x: 0, y: 0, height: 20 }) };

  const api = {
    indent: 10,
    listEl: { current: null },
    visibleNodes: [node],
    get: (id: string) => (id === "a" ? node : null),
    hover: jest.fn(),
    cancelHover: jest.fn(),
    hideCursor: jest.fn(),
    redrawList: jest.fn(),
    canDrop: jest.fn(() => true),
    drop: jest.fn(),
    isSelected: () => false,
    selectedIds: new Set<string>(),
  };
  const store = { dispatch: jest.fn() };

  const { result } = renderHook(() =>
    useDragHandlers(
      api as unknown as TreeApi<unknown>,
      store as unknown as Store<RootState, Actions>,
    ),
  );

  return {
    api,
    store,
    handlers: result.current,
    over: {
      id: "a",
      data: { current: { elementRef: { current: element } } },
    } as unknown as DragMoveEvent["over"],
  };
}

function startEvent(): DragStartEvent {
  return { active: { id: "a" } } as unknown as DragStartEvent;
}

function moveEvent(over: DragMoveEvent["over"], delta: { x: number; y: number }): DragMoveEvent {
  return {
    over,
    activatorEvent: { clientX: 0, clientY: 0 },
    delta,
  } as unknown as DragMoveEvent;
}

/* dnd-kit adds the list's scroll offset to `delta`, so after a mid-drag scroll
   `activator + delta` is not where the pointer is. The drop has to use the
   pointer, or it lands one row off. */
test("measures against the pointer, not activator + delta", () => {
  const { api, handlers, over } = setup();

  /* onDragStart and the pointer event are in one act() on purpose: if the
     listeners were attached in an effect they would not exist yet, and the
     drag would fall back to activator + delta. */
  act(() => {
    handlers.onDragStart(startEvent());
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 0, clientY: 5 }));
    handlers.onDragMove(moveEvent(over, { x: 0, y: 200 }));
  });

  /* Pointer y 5 is the top half of the row, so the drop goes above it. Using
     activator + delta (y 200) would put the cursor below the row instead. */
  expect(api.hover).toHaveBeenCalledWith(
    { parentId: "p", index: 0 },
    { type: "line", index: 0, level: 0 },
  );
});

test("clears the hover when the pointer leaves every droppable", () => {
  const { api, store, handlers, over } = setup();

  act(() => handlers.onDragStart(startEvent()));
  act(() => {
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 0, clientY: 5 }));
    handlers.onDragMove(moveEvent(over, { x: 0, y: 0 }));
    handlers.onDragMove(moveEvent(null, { x: 0, y: 0 }));
  });

  expect(api.cancelHover).toHaveBeenCalled();
  expect(store.dispatch).toHaveBeenCalledWith(
    expect.objectContaining({ type: "DND_HOVERING", parentId: null, index: null }),
  );
});

test("does not drop when the drag ends over nothing", () => {
  const { api, handlers, over } = setup();

  act(() => handlers.onDragStart(startEvent()));
  act(() => {
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 0, clientY: 5 }));
    handlers.onDragMove(moveEvent(over, { x: 0, y: 0 }));
    handlers.onDragEnd({
      over: null,
      activatorEvent: null,
      delta: { x: 0, y: 0 },
    } as unknown as DragEndEvent);
  });

  expect(api.drop).not.toHaveBeenCalled();
});
