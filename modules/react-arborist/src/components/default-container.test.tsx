import { act, fireEvent, render, screen } from "@testing-library/react";
import { Tree } from "./tree";

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

/* Selecting a row kicks off tree.scrollTo(), whose promise resolves on a
   microtask after fireEvent's synchronous act() scope has exited — the
   resulting List scrollToItem() update would otherwise warn about not being
   wrapped in act(). Awaiting an async act flushes that trailing update. */
async function click(el: Element, init?: MouseEventInit) {
  await act(async () => {
    fireEvent.click(el, init);
  });
}

/* #303: multi-select should respond to Ctrl+Click (Windows) as well as
   Cmd/Meta+Click (macOS). */
test("Ctrl+Click adds a row to the selection (#303)", async () => {
  render(<Tree<Datum> data={data} openByDefault />);
  const [, a, b] = screen.getAllByRole("treeitem");

  await click(a);
  expect(a.getAttribute("aria-selected")).toBe("true");

  await click(b, { ctrlKey: true });
  expect(a.getAttribute("aria-selected")).toBe("true");
  expect(b.getAttribute("aria-selected")).toBe("true");
});

test("Ctrl+Click toggles an already-selected row off (#303)", async () => {
  render(<Tree<Datum> data={data} openByDefault />);
  const [, a, b] = screen.getAllByRole("treeitem");

  await click(a);
  await click(b, { ctrlKey: true });
  await click(b, { ctrlKey: true });

  expect(a.getAttribute("aria-selected")).toBe("true");
  expect(b.getAttribute("aria-selected")).toBe("false");
});

test("Ctrl+Click falls through to a plain select when multi-select is disabled (#303)", async () => {
  render(<Tree<Datum> data={data} openByDefault disableMultiSelection />);
  const [, a, b] = screen.getAllByRole("treeitem");

  await click(a);
  await click(b, { ctrlKey: true });

  expect(a.getAttribute("aria-selected")).toBe("false");
  expect(b.getAttribute("aria-selected")).toBe("true");
});

/* #325: forward an accessible name and multiselectable state onto the
   role="tree" element. */
test("forwards aria-label to the role=tree element (#325)", () => {
  render(<Tree<Datum> data={data} aria-label="File explorer" />);
  expect(screen.getByRole("tree").getAttribute("aria-label")).toBe("File explorer");
});

test("forwards aria-labelledby to the role=tree element (#325)", () => {
  render(<Tree<Datum> data={data} aria-labelledby="heading-id" />);
  expect(screen.getByRole("tree").getAttribute("aria-labelledby")).toBe("heading-id");
});

test("marks the tree aria-multiselectable by default (#325)", () => {
  render(<Tree<Datum> data={data} />);
  expect(screen.getByRole("tree").getAttribute("aria-multiselectable")).toBe("true");
});

test("omits aria-multiselectable when multi-select is disabled (#325)", () => {
  render(<Tree<Datum> data={data} disableMultiSelection />);
  expect(screen.getByRole("tree").hasAttribute("aria-multiselectable")).toBe(false);
});
