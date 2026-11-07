/* dnd-kit's mouse sensor needs a mousedown, a move past the activation
   distance, then a move onto the target and a mouseup. The 50ms waits give
   its animation-frame loop a chance to process each step. */
export function dragAndDrop(src, dst, { yRatio = 0.25 } = {}) {
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
      const endY = dstRect.y + dstRect.height * yRatio;

      cy.wrap(handleEl).trigger("mousedown", {
        button: 0,
        clientX: startX,
        clientY: startY,
        force: true,
      });

      cy.wait(50);

      cy.document().trigger("mousemove", {
        clientX: startX + 10,
        clientY: startY + 10,
        force: true,
      });

      cy.wait(50);

      cy.document().trigger("mousemove", {
        clientX: endX,
        clientY: endY,
        force: true,
      });

      cy.wait(50);

      cy.document().trigger("mouseup", {
        clientX: endX,
        clientY: endY,
        force: true,
      });
    });
  });
}
