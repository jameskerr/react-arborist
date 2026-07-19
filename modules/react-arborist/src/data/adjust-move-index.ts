/**
 * Convert the `index` that `onMove` reports into the index to use when your
 * handler removes the dragged rows *before* inserting them.
 *
 * `onMove`'s `index` is a pre-removal slot: it counts positions in the
 * destination parent's child list as shown on screen, with the dragged rows
 * still in place. The built-in `SimpleTree.move` / `useSimpleTree` handle this
 * by inserting before removing, so the index needs no adjustment there. But a
 * hand-written handler that splices the dragged rows out first — the natural
 * way to reorder an array — shifts its target one place left for every dragged
 * row that started before the drop slot. Without correction, dragging a row to
 * just below itself would jump it past its neighbor (issue #247).
 *
 * Pass the destination parent's current child ids in display order (for a
 * root-level move, that's your top-level data's ids). Ids that aren't among
 * them — i.e. rows moving in from another parent — don't shift anything.
 *
 * @example
 *   const onMove = ({ dragIds, index }) => {
 *     const to = adjustMoveIndex({ index, dragIds, siblingIds: data.map((d) => d.id) });
 *     const dragged = data.filter((d) => dragIds.includes(d.id));
 *     const rest = data.filter((d) => !dragIds.includes(d.id));
 *     rest.splice(to, 0, ...dragged);
 *     setData(rest);
 *   };
 */
export function adjustMoveIndex(args: {
  index: number;
  dragIds: string[];
  siblingIds: string[];
}): number {
  const { index, dragIds, siblingIds } = args;
  const dragging = new Set(dragIds);
  // `index` is a slot in [0, siblingIds.length]; clamp defensively so an
  // out-of-range value yields a usable post-removal insertion index on its own
  // rather than relying on the caller's splice to clamp it.
  const slot = Math.max(0, Math.min(index, siblingIds.length));
  let shift = 0;
  for (let i = 0; i < slot; i++) {
    if (dragging.has(siblingIds[i])) shift++;
  }
  return slot - shift;
}
