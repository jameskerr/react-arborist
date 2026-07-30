import { XYCoord } from "react-dnd";
import { NodeApi } from "../interfaces/node-api";
import { bound, indexOf, isClosed, isItem } from "../utils";
import { DropResult } from "./drop-hook";

function measureHover(el: HTMLElement, offset: XYCoord) {
  const rect = el.getBoundingClientRect();
  const x = offset.x - Math.round(rect.x);
  const y = offset.y - Math.round(rect.y);
  const height = rect.height;
  const inTopHalf = y < height / 2;
  const inBottomHalf = !inTopHalf;
  const pad = height / 4;
  const inMiddle = y > pad && y < height - pad;
  const atTop = !inMiddle && inTopHalf;
  const atBottom = !inMiddle && inBottomHalf;
  return { x, inTopHalf, inBottomHalf, inMiddle, atTop, atBottom };
}

type HoverData = ReturnType<typeof measureHover>;

function getNodesAroundCursor(
  node: NodeApi | null,
  prev: NodeApi | null,
  next: NodeApi | null,
  hover: HoverData,
): [NodeApi | null, NodeApi | null] {
  if (!node) {
    // We're hovering over an empty part of the list. Outer drop targets pass
    // the nearest visible nodes so top padding can resolve before the first
    // item while the empty area below the rows still resolves after the last.
    return [prev, next];
  }
  if (node.isInternal) {
    if (hover.atTop) {
      return [prev, node];
    } else if (hover.inMiddle) {
      return [node, node];
    } else {
      return [node, next];
    }
  } else {
    if (hover.inTopHalf) {
      return [prev, node];
    } else {
      return [node, next];
    }
  }
}

type Args = {
  element: HTMLElement;
  initialOffset?: XYCoord | null;
  offset: XYCoord;
  indent: number;
  node: NodeApi | null;
  prevNode: NodeApi | null;
  nextNode: NodeApi | null;
  sourceLevel?: number | null;
};

export type ComputedDrop = {
  drop: DropResult | null;
  cursor: Cursor | null;
};

function dropAt(parentId: string | undefined, index: number | null): DropResult {
  return { parentId: parentId || null, index };
}

function lineCursor(index: number, level: number) {
  return {
    type: "line" as const,
    index,
    level,
  };
}

function noCursor() {
  return {
    type: "none" as const,
  };
}

function highlightCursor(id: string) {
  return {
    type: "highlight" as const,
    id,
  };
}

function walkUpFrom(node: NodeApi, level: number) {
  let drop = node;
  while (drop.parent && drop.level > level) {
    drop = drop.parent;
  }
  const parentId = drop.parent?.id || null;
  const index = indexOf(drop) + 1;
  return { parentId, index };
}

export type LineCursor = ReturnType<typeof lineCursor>;
export type NoCursor = ReturnType<typeof noCursor>;
export type HighlightCursor = ReturnType<typeof highlightCursor>;
export type Cursor = LineCursor | NoCursor | HighlightCursor;

export function isTopPaddingDrop(
  element: HTMLElement,
  offset: XYCoord,
  paddingTop: number,
  scrollOffset: number,
): boolean {
  const rect = element.getBoundingClientRect();
  const visiblePadding = Math.max(0, paddingTop - scrollOffset);
  return visiblePadding > 0 && offset.y < rect.top + visiblePadding;
}

/**
 * This is the most complex, tricky function in the whole repo.
 */
export function computeDrop(args: Args): ComputedDrop {
  const hover = measureHover(args.element, args.offset);
  const indent = args.indent;
  /*
   * A custom node renderer may expose its whole row as the drag source. In that
   * case the absolute pointer x-position reflects where the row was grabbed,
   * not a deliberate request to change hierarchy. Anchor the level to the
   * dragged node and only change it after real horizontal pointer movement.
   */
  const hoverLevel =
    args.initialOffset && args.sourceLevel != null
      ? Math.round(Math.max(0, args.sourceLevel + (args.offset.x - args.initialOffset.x) / indent))
      : Math.round(Math.max(0, hover.x - indent) / indent);
  const { node, nextNode, prevNode } = args;
  const [above, below] = getNodesAroundCursor(node, prevNode, nextNode, hover);

  /* Hovering over the middle of a folder */
  if (node && node.isInternal && hover.inMiddle) {
    return {
      drop: dropAt(node.id, null),
      cursor: highlightCursor(node.id),
    };
  }

  /*
   * Now we only need to care about the node above the cursor
   * -----------                            -------
   */

  /* There is no node above the cursor line */
  if (!above) {
    return {
      drop: dropAt(below?.parent?.id, 0),
      cursor: lineCursor(0, 0),
    };
  }

  /* The node above the cursor line is an item */
  if (isItem(above)) {
    const level = bound(hoverLevel, below?.level || 0, above.level);
    return {
      drop: walkUpFrom(above, level),
      cursor: lineCursor(above.rowIndex! + 1, level),
    };
  }

  /* The node above the cursor line is a closed folder */
  if (isClosed(above)) {
    const level = bound(hoverLevel, below?.level || 0, above.level);
    return {
      drop: walkUpFrom(above, level),
      cursor: lineCursor(above.rowIndex! + 1, level),
    };
  }

  /*
   * The node above the cursor is an open folder — empty or with children.
   * `below` is either the folder's first child (children) or its next sibling
   * (empty), but neither pins the slide: the deep end is the folder's first
   * child (above.level + 1) and the shallow end walks up the ancestor chain,
   * which walkUpFrom() clamps at the root. Sliding right drops as the first
   * child (the historical default); sliding left drops as a sibling or
   * grandsibling of the folder (#330).
   */
  const level = bound(hoverLevel, 0, above.level + 1);
  if (level > above.level) {
    /* Will be the first child of the folder */
    return {
      drop: dropAt(above.id, 0),
      cursor: lineCursor(above.rowIndex! + 1, level),
    };
  } else {
    /* Will be a sibling or grandsibling of the folder */
    return {
      drop: walkUpFrom(above, level),
      cursor: lineCursor(above.rowIndex! + 1, level),
    };
  }
}
