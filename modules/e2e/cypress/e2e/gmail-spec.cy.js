const TOTAL_ITEMS = 17;

describe("Testing the Gmail Demo", () => {
  beforeEach(() => {
    cy.visit("http://localhost:3000/gmail");
    cy.get("[role=treeitem]").as("item");
  });

  it("Edits The Social Node", () => {
    cy.get("[role=treeitem").contains("Social").click();
    cy.focused().type("{enter}");
    cy.focused().type("My Favorite Social Sites{enter}");
    cy.get("[role=treeitem]").contains("My Favorite Social Sites");
  });

  it("Collapses and Expands the Categories", () => {
    cy.get("@item").should("have.length", TOTAL_ITEMS);
    cy.get("@item").contains("Categories").click();
    cy.get("@item").should("have.length", "12");
    cy.get("@item").contains("Categories").click();
    cy.get("@item").should("have.length", TOTAL_ITEMS);
  });

  it("Up and Down Arrows", () => {
    cy.get("@item").first().click();
    cy.focused().type("{downArrow}");
    cy.focused().should("contain.text", "Starred");
    cy.focused().type("{downArrow}");
    cy.focused().should("contain.text", "Snoozed");
    cy.focused().type("{upArrow}{upArrow}{upArrow}{upArrow}");
    cy.focused().should("contain.text", "Inbox");
  });

  it("Left and Right Arrows", () => {
    cy.get("@item").should("have.length", TOTAL_ITEMS);
    cy.get("@item").contains("Categories").click();
    cy.focused().type("{leftArrow}");
    cy.get("@item").should("have.length", 12);
    cy.focused().type("{rightArrow}");
    cy.get("@item").should("have.length", TOTAL_ITEMS);
    cy.focused().should("contain.text", "Categories");
    cy.focused().type("{rightArrow}");
    cy.focused().should("contain.text", "Social");
    cy.focused().type("{downArrow}");
    cy.focused().type("{downArrow}");
    cy.focused().should("contain.text", "Forums");
  });

  it("Creates Leaf Nodes", () => {
    // At the root level
    cy.get("@item").first().click();
    cy.focused().type("a");
    cy.focused().type("Turn A New Leaf{enter}");
    cy.get("@item").should("have.length", TOTAL_ITEMS + 1);

    // In a Folder
    cy.get("@item").contains("Social").click();
    cy.focused().type("a");
    cy.focused().type("Turn More Leaves{enter}");
    cy.get("@item").should("have.length", TOTAL_ITEMS + 2);

    // On a folder that is closed
    cy.get("@item").contains("Categories").click(); // closed it
    cy.focused().should("have.attr", "aria-expanded", "false");
    cy.focused().type("a");
    cy.focused().type("Root{enter}");
    cy.get("@item").contains("Root").click();
    cy.focused().should("have.attr", "aria-level", "1");

    // On a folder that is open
    cy.get("@item").contains("Categories").click(); // opened it
    cy.focused().should("have.attr", "aria-expanded", "true");
    cy.focused().type("a");
    cy.focused().type("Child{enter}");
    cy.get("@item").contains("Child").click();
    cy.focused().should("have.attr", "aria-level", "2");
  });

  it("Creates Internal Nodes", () => {
    // At the root level
    cy.get("@item").first().click();
    cy.focused().type("A");
    cy.focused().type("Turn A New Internal{enter}");
    cy.get("@item").should("have.length", TOTAL_ITEMS + 1);
    cy.focused().children().should("have.class", "isInternal");

    // In a Folder
    cy.get("@item").contains("Social").click();
    cy.focused().type("A");
    cy.focused().type("Turn More Inernals{enter}");
    cy.get("@item").should("have.length", TOTAL_ITEMS + 2);
    cy.focused().children().should("have.class", "isInternal");

    // On a folder that is closed
    cy.get("@item").contains("Categories").click(); // closed it
    cy.focused().should("have.attr", "aria-expanded", "false");
    cy.focused().type("A");
    cy.focused().type("Root{enter}");
    cy.get("@item").contains("Root").click();
    cy.focused().children().should("have.class", "isInternal");
    cy.focused().should("have.attr", "aria-level", "1");

    // On a folder that is open
    cy.get("@item").contains("Categories").click(); // opened it
    cy.focused().should("have.attr", "aria-expanded", "true");
    cy.focused().type("A");
    cy.focused().type("Child{enter}");
    cy.get("@item").contains("Child").click();
    cy.focused().should("have.attr", "aria-level", "2");
  });

  it("drags and drops in its list", () => {
    dragAndDrop(
      cy.get("@item").contains("Inbox").first(),
      cy.get("@item").contains("Sent").first()
    );

    cy.get("@item").contains("Inbox").click();
    cy.focused().invoke("index").should("eq", 2);
  });

  it("drags and drops into folder", () => {
    dragAndDrop(
      cy.get("@item").contains("Starred").first(),
      cy.get("@item").contains("Social").first()
    );
    cy.get("@item").contains("Starred").click();
    cy.focused().invoke("index").should("eq", 11);
  });

  it("prevents Inbox from Dragging into Categories", () => {
    dragAndDrop(
      cy.get("@item").contains("Inbox").first(),
      cy.get("@item").contains("Social").first()
    );
    cy.get("@item").contains("Inbox").click();
    cy.focused().invoke("index").should("eq", 0);
  });

  it("filters to github, then checks expanding and collapsing", () => {
    cy.get("input").type("Git");
    cy.get("@item").should("have.length", 3);
    cy.get("@item").contains("Categories").click(); // collapses
    cy.get("@item").should("have.length", 1);
  });

  it("can select inbox but not categories", () => {
    cy.get("@item").contains("Inbox").click();
    cy.focused().should("have.attr", "aria-selected", "true");
    cy.get("@item").contains("Categories").click();
    cy.focused().should("have.attr", "aria-selected", "false");
    // Existing selection on Inbox is preserved when clicking an unselectable node
    cy.get("@item")
      .contains("Inbox")
      .parents("[role=treeitem]")
      .should("have.attr", "aria-selected", "true");
  });

  it("select all does not select categories or spam", () => {
    cy.get("@item").contains("Inbox").click();
    cy.focused().type("{meta}a");
    cy.get("[aria-selected='true']")
      .should("not.contain.text", "Categories")
      .should("not.contain.text", "Spam")
      .should("contain.text", "Inbox")
      .should("have.length", TOTAL_ITEMS - 2);
  });
});

function dragAndDrop(src, dst) {
  const dataTransfer = new DataTransfer();
  src.trigger("dragstart", { dataTransfer });
  dst.trigger("drop", { dataTransfer });
  dst.trigger("dragend", { dataTransfer });
}
