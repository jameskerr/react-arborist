/* dnd-kit's pointer sensor needs a pointerdown, a move past the activation
   distance, then a move onto the target and a pointerup. The 50ms waits give
   its animation-frame loop a chance to process each step. */
export function dragAndDrop(src, dst) {
  src.then(($src) => {
    /* A spec may select the row itself or a label inside it. */
    const row = $src[0].closest("[role=treeitem]") || $src[0];
    const handleEl = row.firstElementChild || row;
    const srcRect = handleEl.getBoundingClientRect();
    const startX = srcRect.x + srcRect.width / 2;
    const startY = srcRect.y + srcRect.height / 2;

    dst.then(($dst) => {
      const targetRow = $dst[0].closest("[role=treeitem]") || $dst[0];
      const dstRect = targetRow.getBoundingClientRect();
      const endX = dstRect.x + dstRect.width / 2;
      const endY = dstRect.y + dstRect.height * 0.25;

      cy.wrap(handleEl).trigger("pointerdown", {
        button: 0,
        clientX: startX,
        clientY: startY,
        pointerId: 1,
        isPrimary: true,
        force: true,
      });

      cy.wait(50);

      cy.document().trigger("pointermove", {
        clientX: startX + 10,
        clientY: startY + 10,
        pointerId: 1,
        isPrimary: true,
        force: true,
      });

      cy.wait(50);

      cy.document().trigger("pointermove", {
        clientX: endX,
        clientY: endY,
        pointerId: 1,
        isPrimary: true,
        force: true,
      });

      cy.wait(50);

      cy.document().trigger("pointerup", {
        clientX: endX,
        clientY: endY,
        pointerId: 1,
        isPrimary: true,
        force: true,
      });
    });
  });
}
