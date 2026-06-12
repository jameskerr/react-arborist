import { act, renderHook } from "@testing-library/react";
import { useSimpleTree } from "./use-simple-tree";

/* onCreate has to write a new node's id (and a folder's children) under a key
   the accessors will read back. A function accessor can't be inverted to a key,
   so creation with one must fail fast rather than return an unusable node
   (issue #73 review follow-up). */
describe("useSimpleTree onCreate guards function accessors", () => {
  function controllerFor<T>(data: T[], options: Parameters<typeof useSimpleTree<T>>[1]) {
    const { result } = renderHook(() => useSimpleTree<T>(data, options));
    return result.current[1];
  }

  const create = { parentId: null, parentNode: null, index: 0 } as const;

  test("throws when idAccessor is a function", () => {
    const controller = controllerFor([{ uuid: "1", name: "a" }], { idAccessor: (d) => d.uuid });
    expect(() => controller.onCreate({ ...create, type: "leaf" })).toThrow(
      /idAccessor is a function/,
    );
  });

  test("throws when creating a folder with a function childrenAccessor", () => {
    const controller = controllerFor([{ id: "1", name: "a" }], {
      childrenAccessor: (d) => (d as any).kids,
    });
    expect(() => controller.onCreate({ ...create, type: "internal" })).toThrow(
      /childrenAccessor is a function/,
    );
  });

  test("a leaf can still be created when only childrenAccessor is a function", () => {
    const controller = controllerFor([{ id: "1", name: "a" }], {
      childrenAccessor: (d) => (d as any).kids,
    });
    // onCreate calls setData, so run it inside act to keep the suite warning-clean.
    expect(() => act(() => void controller.onCreate({ ...create, type: "leaf" }))).not.toThrow();
  });
});
