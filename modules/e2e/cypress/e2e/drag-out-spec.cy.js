/* The /drag-out demo renders a tree beside an external react-dnd drop zone.
   Both share one backend (via the dndManager prop), and the zone accepts the
   default "NODE" type, so dropping a row onto the zone hands it the dragged
   node's data — proving the drag item now carries `data`. */

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
    // Drag from the node's text, which lives inside the element carrying the
    // drag handle, so react-dnd's source listener runs and builds the item.
    dragAndDrop(cy.get("@item").contains("report.txt"), cy.get("[data-testid=drop-zone]"));

    // The zone read item.data.name off the drag item and listed it.
    cy.get("[data-testid=drop-zone]").should("contain.text", "report.txt");
  });

  it("still reorders nodes within the tree", () => {
    // Internal drops keep working because the default "NODE" type is unchanged.
    cy.contains("[role=treeitem]", "installer.dmg").should("have.css", "top", "128px");
    dragAndDrop(cy.get("@item").contains("installer.dmg"), cy.get("@item").contains("report.txt"));
    // installer.dmg moved up near report.txt, so its offset dropped below 128px.
    cy.get("@item").should("have.length", 5);
    cy.contains("[role=treeitem]", "installer.dmg").then(($el) => {
      expect(parseFloat($el.css("top"))).to.be.lessThan(128);
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
