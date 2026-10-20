/* The /drag-out demo renders a tree beside an external @dnd-kit drop zone.
   Both share one DndContext, and the zone accepts the dragged node's data. */

describe("Drag Nodes Out Demo", () => {
  beforeEach(() => {
    cy.visit("http://localhost:3000/drag-out");
    cy.get("[role=treeitem]").as("item");
  });

  it("renders the tree and an empty drop zone", () => {
    cy.contains("[role=treeitem]", "Documents");
    cy.get("[data-testid=drop-zone]").should("contain.text", "Drag any node onto this zone.");
  });

  it("hands the dragged node's data to an external drop target", () => {
    cy.contains("[role=treeitem]", "report.txt").should("be.visible");
    dragAndDrop(cy.contains("[role=treeitem]", "report.txt"), cy.get("[data-testid=drop-zone]"));

    // The zone read item.data.name off the drag item and listed it.
    cy.get("[data-testid=drop-zone]").should("contain.text", "report.txt");
  });

  it("still reorders nodes within the tree", () => {
    cy.contains("[role=treeitem]", "installer.dmg").should("have.css", "top", "128px");
    dragAndDrop(
      cy.contains("[role=treeitem]", "installer.dmg"),
      cy.contains("[role=treeitem]", "report.txt"),
    );
    // installer.dmg moved up near report.txt, so its offset dropped below 128px.
    cy.get("@item").should("have.length", 5);
    cy.contains("[role=treeitem]", "installer.dmg").should(($el) => {
      expect(parseFloat($el.css("top"))).to.be.lessThan(128);
    });
  });
});

function dragAndDrop(src, dst) {
  src.then(($src) => {
    const handleEl = $src[0].closest("[role=treeitem]")?.firstElementChild || $src[0];
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

      cy.wait(50);
    });
  });
}
