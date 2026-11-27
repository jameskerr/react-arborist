/* The /budget demo is a controlled tree whose folder rows show the sum of
   their descendants' amounts. Moving an expense must update every affected
   folder total while the grand total stays put. */

describe("Budget Tree Demo", () => {
  beforeEach(() => {
    cy.visit("http://localhost:3000/budget");
    cy.get("[role=treeitem]").as("item");
  });

  it("shows folder totals as the sum of their descendants", () => {
    cy.contains("[role=treeitem]", "Utilities").should("contain.text", "$195");
    cy.contains("[role=treeitem]", "Housing").should("contain.text", "$1,995");
    cy.contains("[role=treeitem]", "Entertainment").should("contain.text", "$0");
    cy.get("[data-testid=grand-total]").should("have.text", "$3,175");
  });

  it("updates folder totals when an expense moves between folders", () => {
    // Dropping on the middle of a folder row moves the expense into it.
    dragAndDrop(cy.get("@item").contains("Internet"), cy.get("@item").contains("Entertainment"));

    cy.contains("[role=treeitem]", "Entertainment").should("contain.text", "$60");
    cy.contains("[role=treeitem]", "Utilities").should("contain.text", "$135");
    cy.contains("[role=treeitem]", "Housing").should("contain.text", "$1,935");
    cy.get("[data-testid=grand-total]").should("have.text", "$3,175");
  });
});

function dragAndDrop(src, dst) {
  const dataTransfer = new DataTransfer();
  src.trigger("dragstart", { dataTransfer });
  /* A real drag sends dragenter before dragover; without it react-dnd never
     registers the row as a drop target. Send the pointer at the middle of the
     target row so computeDrop takes its folder branch. */
  dst.then(($dst) => {
    $dst[0].scrollIntoView({ block: "center" });
    const rect = $dst[0].getBoundingClientRect();
    const pointer = { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 };
    cy.wrap($dst)
      .trigger("dragenter", { dataTransfer, scrollBehavior: false, ...pointer })
      .trigger("dragover", { dataTransfer, scrollBehavior: false, ...pointer })
      .trigger("drop", { dataTransfer, scrollBehavior: false, ...pointer });
  });
  src.trigger("dragend", { dataTransfer });
}
