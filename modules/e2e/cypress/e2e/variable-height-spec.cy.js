/* The /variable-height demo sizes folders at 48px and leaves at 28px via a
   rowHeight function. With openByDefault the visible order and offsets are:

     Documents      folder  h=48  top=0
     report.txt     leaf    h=28  top=48
     notes.txt      leaf    h=28  top=76
     Images         folder  h=48  top=104
     photo.png      leaf    h=28  top=152
     diagram.svg    leaf    h=28  top=180
     Downloads      folder  h=48  top=208
     installer.dmg  leaf    h=28  top=256
*/

describe("Variable Row Height Demo", () => {
  beforeEach(() => {
    cy.visit("http://localhost:3000/variable-height");
    cy.get("[role=treeitem]").as("item");
  });

  it("renders folders taller than leaves", () => {
    cy.get("@item").should("have.length", 8);
    cy.contains("[role=treeitem]", "Documents").should("have.css", "height", "48px");
    cy.contains("[role=treeitem]", "Images").should("have.css", "height", "48px");
    cy.contains("[role=treeitem]", "report.txt").should("have.css", "height", "28px");
    cy.contains("[role=treeitem]", "installer.dmg").should("have.css", "height", "28px");
  });

  it("positions rows at cumulative variable offsets", () => {
    cy.contains("[role=treeitem]", "Documents").should("have.css", "top", "0px");
    cy.contains("[role=treeitem]", "report.txt").should("have.css", "top", "48px");
    cy.contains("[role=treeitem]", "notes.txt").should("have.css", "top", "76px");
    cy.contains("[role=treeitem]", "Images").should("have.css", "top", "104px");
    cy.contains("[role=treeitem]", "Downloads").should("have.css", "top", "208px");
    cy.contains("[role=treeitem]", "installer.dmg").should("have.css", "top", "256px");
  });

  it("recomputes offsets when a folder collapses", () => {
    // Click the row's text node (not the treeitem box) so the click always
    // lands on the handler, regardless of how the renderer fills the row.
    cy.get("@item").contains("Documents").click(); // collapse
    // Only Documents, Downloads, and installer.dmg remain visible.
    cy.get("@item").should("have.length", 3);
    // Downloads now sits directly below Documents (one 48px row) instead of at 208px.
    cy.contains("[role=treeitem]", "Downloads").should("have.css", "top", "48px");
    cy.contains("[role=treeitem]", "installer.dmg").should("have.css", "top", "96px");
  });

  it("recomputes offsets after a drag and drop", () => {
    cy.contains("[role=treeitem]", "installer.dmg").should("have.css", "top", "256px");

    dragAndDrop(
      cy.contains("[role=treeitem]", "installer.dmg"),
      cy.contains("[role=treeitem]", "report.txt"),
    );

    // The tree still has every node, and the layout starts at the top.
    cy.get("@item").should("have.length", 8);
    cy.contains("[role=treeitem]", "Documents").should("have.css", "top", "0px");

    // installer.dmg dropped near the top, so its offset is recomputed well above 256px.
    cy.contains("[role=treeitem]", "installer.dmg").then(($el) => {
      expect(parseFloat($el.css("top"))).to.be.lessThan(256);
    });
  });
});

function dragAndDrop(src, dst) {
  const dataTransfer = new DataTransfer();
  src.trigger("dragstart", { dataTransfer });
  dst.trigger("dragover", { dataTransfer });
  dst.trigger("drop", { dataTransfer });
  dst.trigger("dragend", { dataTransfer });
}
