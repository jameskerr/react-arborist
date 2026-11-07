import { dragAndDrop } from "../support/drag.js";

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
      cy.get("@item").contains("Sent").first(),
    );

    cy.get("@item").contains("Inbox").click();
    cy.focused().invoke("index").should("eq", 2);
  });

  it("drags and drops into folder", () => {
    dragAndDrop(
      cy.get("@item").contains("Starred").first(),
      cy.get("@item").contains("Social").first(),
    );
    cy.get("@item").contains("Starred").click();
    cy.focused().invoke("index").should("eq", 11);
  });

  it("drops beside the row under the pointer after the list auto-scrolls mid-drag", () => {
    /* Shorten the scrolling list in place: a viewport resize would remount the
       rows the drag starts from. */
    cy.get("@item")
      .first()
      .parents()
      .filter((_, el) => getComputedStyle(el).overflowY === "auto")
      .first()
      .then(($outer) => {
        $outer[0].style.height = "500px";
      });
    cy.wait(100);

    cy.get("@item")
      .contains("Sent")
      .first()
      .then(($row) => {
        const row = $row[0];
        const handle = row.firstElementChild || row;
        const scroller = $row
          .parents()
          .filter((_, el) => getComputedStyle(el).overflowY === "auto")[0];
        const listRect = scroller.getBoundingClientRect();
        const handleRect = handle.getBoundingClientRect();
        const x = handleRect.x + handleRect.width / 2;
        const y = handleRect.y + handleRect.height / 2;
        /* Inside the bottom edge band that dnd-kit auto-scrolls in, and in the
           top half of the last row so the drop cursor goes above that row. */
        const edgeY = listRect.bottom - 71;

        cy.wrap(handle).trigger("mousedown", {
          button: 0,
          clientX: x,
          clientY: y,
          force: true,
        });
        cy.wait(50);
        cy.document().trigger("mousemove", {
          clientX: x,
          clientY: y + 10,
          force: true,
        });
        cy.wait(50);
        cy.document().trigger("mousemove", {
          clientX: x,
          clientY: edgeY,
          force: true,
        });

        /* Hold the pointer still and let dnd-kit's auto-scroller move the list
           under it. There is no further mousemove before the drop, so the
           drag delta and the real pointer position disagree by the scrolled
           distance. */
        for (let i = 0; i < 8; i++) cy.wait(100);

        cy.wrap(scroller).invoke("prop", "scrollTop").should("be.greaterThan", 0);

        cy.get("@item").then(($items) => {
          const visible = Array.from($items).filter((el) => {
            const rect = el.getBoundingClientRect();
            return (
              el.textContent.trim() !== "Sent" &&
              rect.top >= listRect.top - 1 &&
              rect.bottom <= listRect.bottom + 1
            );
          });
          /* The bottom-most row: once the list has scrolled as far as it goes,
             the pointer's band sits over it. */
          const anchor = visible[visible.length - 1];
          assert.isOk(anchor, "row under the pointer after auto-scrolling");
          const anchorRect = anchor.getBoundingClientRect();
          assert.isBelow(edgeY, anchorRect.bottom, "pointer is over the anchor row");
          assert.isAbove(edgeY, anchorRect.top, "pointer is over the anchor row");
          const anchorLabel = anchor.textContent.trim();

          cy.document().trigger("mouseup", {
            clientX: x,
            clientY: edgeY,
            force: true,
          });

          /* Scroll back to the top so every row ahead of the pair is mounted
             and DOM order matches tree order. */
          cy.wrap(scroller).then(($scroller) => {
            $scroller[0].scrollTop = 0;
          });
          cy.wait(100);
          cy.get("@item").then(($after) => {
            const items = Array.from($after);
            const positionOf = (label) =>
              items.findIndex((el) => el.textContent.trim().startsWith(label));
            const anchorIndex = positionOf(anchorLabel);
            const sentIndex = positionOf("Sent");
            assert.isAtLeast(anchorIndex, 0, "anchor row still rendered");
            assert.isAtLeast(sentIndex, 0, "dragged row still rendered");
            /* The drop lands beside the row that was under the pointer, not back
               at the position that was hovered before the list scrolled. Before
               or after that row depends on the cursor line, so allow either. */
            expect(
              Math.abs(sentIndex - anchorIndex),
              "Sent lands beside the anchor row",
            ).to.be.at.most(1);
          });
        });
      });
  });

  it("prevents Inbox from Dragging into Categories", () => {
    dragAndDrop(
      cy.get("@item").contains("Inbox").first(),
      cy.get("@item").contains("Social").first(),
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
