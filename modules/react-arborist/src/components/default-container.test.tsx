import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

/* #10: a row's background/selection highlight must span the full scrollable
   width, not stop at the viewport edge, when content overflows horizontally. */
test("rows get min-width: max-content so the highlight spans overflow (#10)", () => {
  render(<Tree<Datum> data={data} openByDefault />);
  for (const row of screen.getAllByRole("treeitem")) {
    expect((row as HTMLElement).style.minWidth).toBe("max-content");
  }
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

/* #245, #308: clicking the empty area below the rows clears the selection by
   default; disableDeselectOnClick opts out of that. The deselect handler lives
   on the list's outer (scroll) element, which is wired to tree.listEl. */
test("clicking empty tree space clears the selection by default (#245)", async () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> data={data} openByDefault ref={ref} />);
  const [, a] = screen.getAllByRole("treeitem");

  await click(a);
  expect(a.getAttribute("aria-selected")).toBe("true");

  await click(ref.current!.listEl.current!);
  expect(a.getAttribute("aria-selected")).toBe("false");
});

test("disableDeselectOnClick keeps the selection when empty space is clicked (#245, #308)", async () => {
  const ref = createRef<TreeApi<Datum> | undefined>();
  render(<Tree<Datum> data={data} openByDefault disableDeselectOnClick ref={ref} />);
  const [, a] = screen.getAllByRole("treeitem");

  await click(a);
  expect(a.getAttribute("aria-selected")).toBe("true");

  await click(ref.current!.listEl.current!);
  expect(a.getAttribute("aria-selected")).toBe("true");
});

/* #257: an <input> rendered inside the tree (e.g. in a modal) must still
   receive Space keystrokes. The container's keydown handler calls
   preventDefault on Space to toggle/select, which would otherwise swallow the
   character as the event bubbles up from the nested input. */
test("does not preventDefault Space typed into a nested input (#257)", () => {
  render(
    <Tree<Datum> data={data} openByDefault>
      {() => (
        <div>
          <input aria-label="modal-input" />
        </div>
      )}
    </Tree>,
  );
  const [input] = screen.getAllByLabelText("modal-input");

  const notPrevented = fireEvent.keyDown(input, { key: " ", code: "Space" });
  // fireEvent returns false when a listener called preventDefault.
  expect(notPrevented).toBe(true);
});

test("does not preventDefault Space typed into a nested contenteditable (#257)", () => {
  render(
    <Tree<Datum> data={data} openByDefault>
      {() => (
        <div>
          <div aria-label="editable" contentEditable suppressContentEditableWarning />
        </div>
      )}
    </Tree>,
  );
  const [editable] = screen.getAllByLabelText("editable");

  const notPrevented = fireEvent.keyDown(editable, { key: " ", code: "Space" });
  expect(notPrevented).toBe(true);
});

test("still calls preventDefault on Space typed on the tree container itself (#257)", () => {
  render(<Tree<Datum> data={data} openByDefault />);
  const tree = screen.getByRole("tree");

  const notPrevented = fireEvent.keyDown(tree, { key: " ", code: "Space" });
  expect(notPrevented).toBe(false);
});
