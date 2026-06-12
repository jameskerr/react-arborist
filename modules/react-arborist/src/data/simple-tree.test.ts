import { SimpleTree } from "./simple-tree";

describe("SimpleTree with default accessors", () => {
  const data = () => [
    { id: "1", name: "a", children: [{ id: "1a", name: "a-child" }] },
    { id: "2", name: "b" },
  ];

  test("finds nodes by id, including nested ones", () => {
    const tree = new SimpleTree(data());
    expect(tree.find("2")?.data.name).toBe("b");
    expect(tree.find("1a")?.data.name).toBe("a-child");
  });

  test("moves a node into a folder", () => {
    const tree = new SimpleTree(data());
    tree.move({ id: "2", parentId: "1", index: 1 });
    expect(tree.data[0].children!.map((c) => c.id)).toEqual(["1a", "2"]);
    expect(tree.data).toHaveLength(1);
  });
});

describe("SimpleTree honors custom accessors (issue #73, #170)", () => {
  // Custom keys: `uuid` for the id, `elements` for the children.
  const data = () => [
    { uuid: "1", name: "a", elements: [{ uuid: "1a", name: "a-child" }] },
    { uuid: "2", name: "b" },
  ];

  function tree() {
    return new SimpleTree(data(), { idAccessor: "uuid", childrenAccessor: "elements" });
  }

  test("finds nodes by the custom id key, including nested ones", () => {
    const t = tree();
    expect(t.find("2")?.data.name).toBe("b");
    expect(t.find("1a")?.data.name).toBe("a-child"); // read through `elements`
  });

  test("reorders a node, writing children back under the custom key (#170)", () => {
    const t = tree();
    t.move({ id: "2", parentId: "1", index: 1 });
    expect(t.data).toHaveLength(1);
    expect(t.data[0].elements!.map((c) => c.uuid)).toEqual(["1a", "2"]);
  });

  test("moving a node with children into a childless node keeps its children (#73)", () => {
    const t = tree();
    // Put node "1" (which has children) inside node "2" (which has none).
    t.move({ id: "1", parentId: "2", index: 0 });
    expect(t.data.map((n) => n.uuid)).toEqual(["2"]);
    const moved = t.find("1");
    expect(moved?.data.elements!.map((c: any) => c.uuid)).toEqual(["1a"]);
  });

  test("supports a function idAccessor", () => {
    const t = new SimpleTree(data(), { idAccessor: (d) => d.uuid, childrenAccessor: "elements" });
    expect(t.find("1a")?.data.name).toBe("a-child");
    t.move({ id: "2", parentId: "1", index: 1 });
    expect(t.data[0].elements!.map((c) => c.uuid)).toEqual(["1a", "2"]);
  });

  test("a function idAccessor that reaches into the data doesn't throw on construction", () => {
    const nested = [{ meta: { id: "x" }, name: "x" }];
    // The synthetic root must not run this accessor on its empty data.
    expect(() => new SimpleTree(nested, { idAccessor: (d) => d.meta.id })).not.toThrow();
  });
});
