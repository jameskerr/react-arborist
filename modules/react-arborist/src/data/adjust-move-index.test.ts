import { adjustMoveIndex } from "./adjust-move-index";

/* Apply an onMove the naive remove-then-insert way, using the adjusted index,
   and return the resulting id order. Mirrors what a custom onMove does with a
   flat data array. */
function reorder(ids: string[], dragIds: string[], index: number): string[] {
  const to = adjustMoveIndex({ index, dragIds, siblingIds: ids });
  const dragged = ids.filter((id) => dragIds.includes(id));
  const rest = ids.filter((id) => !dragIds.includes(id));
  rest.splice(to, 0, ...dragged);
  return rest;
}

describe("adjustMoveIndex (#247)", () => {
  const list = ["a", "b", "c"];

  test("dropping a row just below itself keeps it in place", () => {
    // computeDrop reports index 1 for the a|b gap; the raw value would move "a"
    // past "b". Adjusting brings it back to 0.
    expect(adjustMoveIndex({ index: 1, dragIds: ["a"], siblingIds: list })).toBe(0);
    expect(reorder(list, ["a"], 1)).toEqual(["a", "b", "c"]);
  });

  test("dropping a row just above itself keeps it in place", () => {
    // The b|c gap reports index 2 when dragging "b" down onto it.
    expect(adjustMoveIndex({ index: 2, dragIds: ["b"], siblingIds: list })).toBe(1);
    expect(reorder(list, ["b"], 2)).toEqual(["a", "b", "c"]);
  });

  test("moving a row to the very bottom lands it last", () => {
    expect(adjustMoveIndex({ index: 3, dragIds: ["a"], siblingIds: list })).toBe(2);
    expect(reorder(list, ["a"], 3)).toEqual(["b", "c", "a"]);
  });

  test("moving a row upward past earlier rows needs no shift", () => {
    // "c" (index 2) dropped into the a|b gap (index 1): nothing dragged sits
    // before the slot, so the index is unchanged.
    expect(adjustMoveIndex({ index: 1, dragIds: ["c"], siblingIds: list })).toBe(1);
    expect(reorder(list, ["c"], 1)).toEqual(["a", "c", "b"]);
  });

  test("a row moving in from another parent is not shifted", () => {
    // The dragged id isn't among the destination siblings, so no removal
    // happens in this list and the index is used as-is.
    expect(adjustMoveIndex({ index: 1, dragIds: ["x"], siblingIds: list })).toBe(1);
  });

  test("multiple dragged rows before the slot each shift the index", () => {
    const four = ["a", "b", "c", "d"];
    // Drag "a" and "b" (indices 0 and 1) into the c|d gap (index 3).
    expect(adjustMoveIndex({ index: 3, dragIds: ["a", "b"], siblingIds: four })).toBe(1);
    expect(reorder(four, ["a", "b"], 3)).toEqual(["c", "a", "b", "d"]);
  });

  test("only dragged rows before the slot count", () => {
    const four = ["a", "b", "c", "d"];
    // Drag "a" (index 0) and "d" (index 3) to the b|c gap (index 2): only "a"
    // is before the slot, so shift by 1.
    expect(adjustMoveIndex({ index: 2, dragIds: ["a", "d"], siblingIds: four })).toBe(1);
    expect(reorder(four, ["a", "d"], 2)).toEqual(["b", "a", "d", "c"]);
  });

  test("an index past the end of the sibling list clamps to the end", () => {
    // 99 clamps to the list length (3); after removing the one dragged row that
    // precedes the slot, the insertion point is the end of the 2-item result.
    expect(adjustMoveIndex({ index: 99, dragIds: ["a"], siblingIds: list })).toBe(2);
    expect(reorder(list, ["a"], 99)).toEqual(["b", "c", "a"]);
  });

  test("never returns a negative index", () => {
    expect(adjustMoveIndex({ index: 0, dragIds: ["a"], siblingIds: list })).toBe(0);
  });
});
