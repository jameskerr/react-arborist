import { createStore } from "redux";
import { rootReducer } from "../state/root-reducer";
import { TreeProps } from "../types/tree-props";
import { TreeApi } from "./tree-api";

function setupApi(props: TreeProps<any>) {
  const store = createStore(rootReducer);
  return new TreeApi(store, props, { current: null }, { current: null });
}

const data = [{ id: "folder", children: [{ id: "child" }] }, { id: "leaf" }];

/* NodeApi's action methods must survive being passed as bare callbacks — e.g.
   `<Toggle onClick={node.toggle} />` — without losing `this`. Before they were
   bound in the constructor, a detached call read `this.tree` off `undefined`
   and threw "Cannot read properties of undefined (reading 'tree')" (#301). */
describe("NodeApi action methods are bound to the instance (#301)", () => {
  test("a detached node.toggle still toggles the node's open state", () => {
    const api = setupApi({ data });
    const node = api.get("folder")!;
    expect(node.isOpen).toBe(true); // openByDefault
    const { toggle } = node; // detach, as a custom renderer passing node.toggle would
    expect(() => toggle()).not.toThrow();
    expect(api.isOpen("folder")).toBe(false);
    toggle();
    expect(api.isOpen("folder")).toBe(true);
  });

  test("a detached node.select still selects the node", () => {
    const onSelect = jest.fn();
    const api = setupApi({ data, onSelect });
    const { select } = api.get("leaf")!;
    expect(() => select()).not.toThrow();
    expect(api.selectedIds.has("leaf")).toBe(true);
  });

  test("a detached node.submit still submits a rename (takes an argument)", () => {
    const onRename = jest.fn();
    const api = setupApi({ data, onRename });
    const { submit } = api.get("leaf")!;
    expect(() => submit("renamed")).not.toThrow();
    expect(onRename).toHaveBeenCalledWith(expect.objectContaining({ id: "leaf", name: "renamed" }));
  });

  test.each([
    "select",
    "deselect",
    "selectMulti",
    "selectContiguous",
    "activate",
    "focus",
    "toggle",
    "open",
    "openParents",
    "close",
    "reset",
    "submit",
    "edit",
  ] as const)("node.%s is bound and callable while detached", (method) => {
    const api = setupApi({ data });
    const node = api.get("folder")!;
    const fn = node[method] as () => unknown;
    // The own, bound copy is a different reference than the prototype method.
    expect(node[method]).not.toBe(NodeApi_proto(node)[method]);
    expect(() => fn()).not.toThrow();
  });
});

// Reach the prototype to prove the bound method is an own property shadowing it.
function NodeApi_proto(node: object): any {
  return Object.getPrototypeOf(node);
}
