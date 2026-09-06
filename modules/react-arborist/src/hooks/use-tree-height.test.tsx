import { createRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { Tree } from "../components/tree";
import { TreeApi } from "../interfaces/tree-api";
import { resolveTreeHeight } from "./use-tree-height";

type Datum = { id: string; name: string };

const ROW_HEIGHT = 24;
const data: Datum[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i),
  name: `node ${i}`,
}));
const contentHeight = data.length * ROW_HEIGHT;

/* jsdom does no layout, so the tree element always measures 0. Stand in for the
   browser: `measuredHeight` is what the tree element reports, and the fake
   ResizeObserver lets a test push a new value the way a real resize would. */
let measuredHeight = 0;
let observers: FakeResizeObserver[] = [];

class FakeResizeObserver {
  static constructed = 0;
  constructor(private callback: () => void) {
    FakeResizeObserver.constructed += 1;
  }
  observe() {
    observers.push(this);
  }
  disconnect() {
    observers = observers.filter((o) => o !== this);
  }
  fire() {
    this.callback();
  }
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return this.getAttribute("role") === "tree" ? measuredHeight : 0;
    },
  });
});

afterAll(() => {
  delete (HTMLElement.prototype as any).clientHeight;
});

beforeEach(() => {
  measuredHeight = 0;
  observers = [];
  FakeResizeObserver.constructed = 0;
  (globalThis as any).ResizeObserver = FakeResizeObserver;
});

/* Report a new measured height, as a browser resize would. */
async function resizeTo(height: number) {
  measuredHeight = height;
  await act(async () => {
    observers.forEach((o) => o.fire());
  });
}

function renderTree(props: Partial<React.ComponentProps<typeof Tree<Datum>>>) {
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> ref={ref} data={data} rowHeight={ROW_HEIGHT} {...props} />);
  return ref;
}

function rowCount() {
  return screen.queryAllByRole("treeitem").length;
}

describe("resolveTreeHeight", () => {
  const args = { contentHeight, measured: null, maxHeight: undefined };

  test("a numeric height is used as-is, without measuring", () => {
    expect(resolveTreeHeight({ ...args, height: 300, maxHeight: undefined })).toEqual({
      cssHeight: 300,
      cssMaxHeight: undefined,
      listHeight: 300,
      needsMeasure: false,
      sizedByContent: false,
    });
  });

  test("no height at all keeps the 500px default", () => {
    const plan = resolveTreeHeight({ ...args, height: undefined, maxHeight: undefined });
    expect(plan.listHeight).toBe(500);
    expect(plan.needsMeasure).toBe(false);
  });

  test("a CSS height goes on the element and waits for a measurement", () => {
    const plan = resolveTreeHeight({ ...args, height: "100%", maxHeight: undefined });
    expect(plan).toEqual({
      cssHeight: "100%",
      cssMaxHeight: undefined,
      listHeight: 0,
      needsMeasure: true,
      sizedByContent: false,
    });
    expect(resolveTreeHeight({ ...args, height: "100%", measured: 120 }).listHeight).toBe(120);
  });

  test("auto sizes the tree to its rows", () => {
    const plan = resolveTreeHeight({ ...args, height: "auto", maxHeight: undefined });
    expect(plan.cssHeight).toBe(contentHeight);
    expect(plan.listHeight).toBe(contentHeight);
    expect(plan.needsMeasure).toBe(false);
  });

  test("a numeric maxHeight caps auto without measuring", () => {
    const plan = resolveTreeHeight({ ...args, height: "auto", maxHeight: 100 });
    expect(plan.cssHeight).toBe(contentHeight);
    expect(plan.cssMaxHeight).toBe(100);
    expect(plan.listHeight).toBe(100);
    expect(plan.needsMeasure).toBe(false);
  });

  test("a maxHeight on its own implies auto", () => {
    const plan = resolveTreeHeight({ ...args, height: undefined, maxHeight: 100 });
    expect(plan.cssHeight).toBe(contentHeight);
    expect(plan.listHeight).toBe(100);
  });

  test("auto under a CSS maxHeight measures the clamped element", () => {
    const plan = resolveTreeHeight({ ...args, height: "auto", maxHeight: "50%" });
    expect(plan.cssHeight).toBe(contentHeight);
    expect(plan.cssMaxHeight).toBe("50%");
    expect(plan.needsMeasure).toBe(true);
    expect(
      resolveTreeHeight({ ...args, height: "auto", maxHeight: "50%", measured: 96 }).listHeight,
    ).toBe(96);
  });

  test("a cap larger than the content leaves the content height alone", () => {
    expect(resolveTreeHeight({ ...args, height: "auto", maxHeight: 5000 }).listHeight).toBe(
      contentHeight,
    );
  });
});

test("a numeric height never observes the element (#86)", () => {
  const ref = renderTree({ height: 300 });

  expect(FakeResizeObserver.constructed).toBe(0);
  expect(ref.current?.height).toBe(300);
  expect(screen.getByRole("tree").style.height).toBe("300px");
});

test("a percentage height fills the measured element (#86)", async () => {
  const ref = renderTree({ height: "100%" });
  const el = screen.getByRole("tree");

  /* The CSS value stays on the element; the list gets the pixels it resolves to. */
  expect(el.style.height).toBe("100%");
  await resizeTo(120);

  expect(ref.current?.height).toBe(120);
  /* 120px of 24px rows, plus react-window's overscan — nowhere near all 50. */
  expect(rowCount()).toBeGreaterThan(0);
  expect(rowCount()).toBeLessThan(10);
});

test("rows follow the element as it resizes (#86)", async () => {
  renderTree({ height: "100%" });

  await resizeTo(120);
  const short = rowCount();
  await resizeTo(600);

  expect(rowCount()).toBeGreaterThan(short);
});

test("an unmeasured percentage height renders no rows rather than guessing (#86)", () => {
  const ref = renderTree({ height: "100%" });

  /* Waiting for the measurement costs one render of nothing, rather than a
     guessed height that would mount every row of a large tree. (react-window
     always keeps one row plus its overscan mounted, even at zero height.) */
  expect(ref.current?.height).toBe(0);
  expect(rowCount()).toBeLessThanOrEqual(2);
});

test("height auto grows to fit every row (#86)", () => {
  const ref = renderTree({ height: "auto" });

  expect(FakeResizeObserver.constructed).toBe(0);
  expect(ref.current?.height).toBe(contentHeight);
  expect(screen.getByRole("tree").style.height).toBe(`${contentHeight}px`);
  expect(rowCount()).toBe(data.length);
});

test("height auto includes the padding props in the content height (#86)", () => {
  const ref = renderTree({ height: "auto", padding: 10 });

  expect(ref.current?.height).toBe(contentHeight + 20);
});

test("a numeric maxHeight caps auto and keeps the list virtualized (#86)", () => {
  const ref = renderTree({ height: "auto", maxHeight: 100 });
  const el = screen.getByRole("tree");

  expect(FakeResizeObserver.constructed).toBe(0);
  expect(ref.current?.height).toBe(100);
  expect(el.style.maxHeight).toBe("100px");
  expect(rowCount()).toBeLessThan(10);
});

test("a maxHeight with no height grows to the content and stops (#86)", () => {
  const ref = renderTree({ maxHeight: 5000 });

  expect(ref.current?.height).toBe(contentHeight);
});

test("a CSS maxHeight is measured off the clamped element (#86)", async () => {
  const ref = renderTree({ height: "auto", maxHeight: "50%" });
  const el = screen.getByRole("tree");

  expect(el.style.height).toBe(`${contentHeight}px`);
  expect(el.style.maxHeight).toBe("50%");
  /* The browser clamps the element; the tree just reads the result back. */
  await resizeTo(96);

  expect(ref.current?.height).toBe(96);
});

test("switching back to a numeric height stops measuring (#86)", async () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  const { rerender } = render(
    <Tree<Datum> ref={ref} data={data} rowHeight={ROW_HEIGHT} height="100%" />,
  );
  await resizeTo(120);
  expect(ref.current?.height).toBe(120);

  rerender(<Tree<Datum> ref={ref} data={data} rowHeight={ROW_HEIGHT} height={300} />);

  expect(ref.current?.height).toBe(300);
  expect(observers).toHaveLength(0);
});

test("the tree still renders when ResizeObserver is missing (#86)", () => {
  delete (globalThis as any).ResizeObserver;
  measuredHeight = 200;

  const ref = renderTree({ height: "100%" });

  /* The layout-effect measurement stands in; only later resizes go unnoticed. */
  expect(ref.current?.height).toBe(200);
  expect(rowCount()).toBeGreaterThan(0);
});

test("a null height falls back to the default, as it always has (#86)", () => {
  /* Not reachable from TypeScript, but `height={bounds?.height ?? null}` is
     ordinary JS, and it used to render a 500px tree rather than nothing. */
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> ref={ref} data={data} rowHeight={ROW_HEIGHT} height={null as any} />);

  expect(ref.current?.height).toBe(500);
});

test("a null maxHeight does not imply auto (#86)", () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> ref={ref} data={data} rowHeight={ROW_HEIGHT} maxHeight={null as any} />);

  expect(ref.current?.height).toBe(500);
});

test("redrawList resizes a tree sized by its rows (#86)", async () => {
  let tall = false;
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> ref={ref} data={data} height="auto" rowHeight={() => (tall ? 48 : 24)} />);
  expect(screen.getByRole("tree").style.height).toBe(`${data.length * 24}px`);

  /* The rowHeight function's output changed for a reason the tree can't see,
     which is exactly what redrawList is for. */
  tall = true;
  await act(async () => {
    ref.current?.redrawList();
  });

  expect(screen.getByRole("tree").style.height).toBe(`${data.length * 48}px`);
});

test("a fixed-height tree ignores redraws (#86)", async () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> ref={ref} data={data} height={300} rowHeight={() => 24} />);

  await act(async () => {
    ref.current?.redrawList();
  });

  expect(ref.current?.height).toBe(300);
  expect(screen.getByRole("tree").style.height).toBe("300px");
});

test("a bare numeric string height is read as pixels (#86)", () => {
  /* "400" is not valid CSS: the browser drops it and the tree ends up with no
     height at all. It is what a config value or String(n) hands you, though. */
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> ref={ref} data={data} rowHeight={ROW_HEIGHT} height={"400" as any} />);

  expect(FakeResizeObserver.constructed).toBe(0);
  expect(ref.current?.height).toBe(400);
  expect(screen.getByRole("tree").style.height).toBe("400px");
  expect(rowCount()).toBeGreaterThan(0);
});

test("a bare numeric string maxHeight caps without measuring (#86)", () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(
    <Tree<Datum>
      ref={ref}
      data={data}
      rowHeight={ROW_HEIGHT}
      height="auto"
      maxHeight={"100" as any}
    />,
  );

  expect(FakeResizeObserver.constructed).toBe(0);
  expect(ref.current?.height).toBe(100);
  expect(screen.getByRole("tree").style.maxHeight).toBe("100px");
});

test("a real CSS length keeps its units and is measured (#86)", async () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> ref={ref} data={data} rowHeight={ROW_HEIGHT} height="400px" />);

  expect(screen.getByRole("tree").style.height).toBe("400px");
  await resizeTo(400);

  expect(ref.current?.height).toBe(400);
});
