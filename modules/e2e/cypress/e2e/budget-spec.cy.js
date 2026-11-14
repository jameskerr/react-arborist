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
    // Dropping just above a row inside the folder moves the expense into it.
    dragAndDrop(cy.get("@item").contains("Internet"), cy.get("@item").contains("Streaming"));

    cy.contains("[role=treeitem]", "Entertainment").should("contain.text", "$60");
    cy.contains("[role=treeitem]", "Utilities").should("contain.text", "$135");
    cy.contains("[role=treeitem]", "Housing").should("contain.text", "$1,935");
    cy.get("[data-testid=grand-total]").should("have.text", "$3,175");
  });
});

function dragAndDrop(src, dst) {
  const dataTransfer = new DataTransfer();
  src.trigger("dragstart", { dataTransfer });
  dst.trigger("dragover", { dataTransfer });
  dst.trigger("drop", { dataTransfer });
  dst.trigger("dragend", { dataTransfer });
}
