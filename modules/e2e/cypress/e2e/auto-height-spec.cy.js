/* The /auto-height demo renders four trees, all with 24px rows:

     [data-cy=fill]        100 flat items, height="100%" in a 240px parent
     [data-cy=auto]        8 open nodes, height="auto"          -> 192px
     [data-cy=capped]      the same 8 nodes, maxHeight={120}    -> 120px
     [data-cy=css-capped]  the same 8 nodes, maxHeight="100%" in a 120px parent
*/

const ROW_HEIGHT = 24;
const OPEN_NODES = 8;

describe("Auto Height Demo", () => {
  beforeEach(() => {
    cy.visit("http://localhost:3000/auto-height");
  });

  it("fills a parent given a percentage height", () => {
    cy.get("[data-cy=fill] [role=tree]").should("have.css", "height", "240px");
  });

  it("renders only the rows that fit the parent", () => {
    /* 240px of 24px rows is ten, plus react-window's overscan — not all 100. */
    cy.get("[data-cy=fill] [role=treeitem]").should("have.length.lessThan", 20);
    cy.get("[data-cy=fill] [role=treeitem]").should("have.length.greaterThan", 5);
  });

  it("follows the parent as it resizes", () => {
    cy.get("[data-cy=fill] [role=treeitem]").then(($rows) => {
      const before = $rows.length;
      cy.get("[data-cy=resize-parent]").click();
      cy.get("[data-cy=fill] [role=tree]").should("have.css", "height", "480px");
      cy.get("[data-cy=fill] [role=treeitem]").should("have.length.greaterThan", before);
    });
  });

  it("grows to fit its rows with height auto", () => {
    cy.get("[data-cy=auto] [role=tree]").should(
      "have.css",
      "height",
      `${OPEN_NODES * ROW_HEIGHT}px`,
    );
    cy.get("[data-cy=auto] [role=treeitem]").should("have.length", OPEN_NODES);
  });

  it("shrinks when a folder closes", () => {
    cy.get("[data-cy=auto] [role=treeitem]").contains("Documents").click();

    /* Two leaves gone: six rows left. */
    cy.get("[data-cy=auto] [role=tree]").should("have.css", "height", `${6 * ROW_HEIGHT}px`);
    cy.get("[data-cy=auto] [role=treeitem]").should("have.length", 6);
  });

  it("stops growing at a numeric maxHeight", () => {
    cy.get("[data-cy=capped] [role=tree]").should("have.css", "height", "120px");
    /* Capped at five rows' worth, so the list is still virtualized. */
    cy.get("[data-cy=capped] [role=treeitem]").should("have.length.lessThan", OPEN_NODES);
  });

  it("measures a CSS maxHeight against the parent", () => {
    cy.get("[data-cy=css-capped] [role=tree]").should("have.css", "height", "120px");
    cy.get("[data-cy=css-capped] [role=treeitem]").should("have.length.lessThan", OPEN_NODES);
  });
});
