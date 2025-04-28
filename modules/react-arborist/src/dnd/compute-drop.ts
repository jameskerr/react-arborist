import { XYCoord } from "react-dnd";
import { NodeApi } from "../interfaces/node-api";
import {
  bound,
  indexOf,
  isClosed,
  isItem,
  isOpenWithEmptyChildren,
} from "../utils";
import { DropResult } from "./drop-hook";
import { TreeApi } from "../interfaces/tree-api";

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
  hover: HoverData
): [NodeApi | null, NodeApi | null] {

  if (!node) {
    // We're hovering over the empty part of the list, not over an item,
    // Put the cursor below the last item which is "prev"
    return [prev, null];
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
  offset: XYCoord;
  indent: number;
  node: NodeApi | null;
  prevNode: NodeApi | null;
  nextNode: NodeApi | null;
  targetTree: TreeApi<unknown> | null;
};

export type ComputedDrop = {
  drop: DropResult | null;
  cursor: Cursor | null;
};

function dropAt(
  parentId: string | undefined,
  index: number | null,
  targetTree: TreeApi<unknown> | null
): DropResult {
  return { parentId: parentId || null, index, targetTree };
}

function lineCursor(index: number, level: number) {
  return {
    type: "line" as "line",
    index,
    level,
  };
}

function noCursor() {
  return {
    type: "none" as "none",
  };
}

function highlightCursor(id: string) {
  return {
    type: "highlight" as "highlight",
    id,
  };
}

function walkUpFrom(node: NodeApi, level: number, targetTree: TreeApi<unknown>|null) {
  let drop = node;
  while (drop.parent && drop.level > level) {
    drop = drop.parent;
  }
  const parentId = drop.parent?.id || null;
  const index = indexOf(drop) + 1;
  return { parentId, index, targetTree };
}

export type LineCursor = ReturnType<typeof lineCursor>;
export type NoCursor = ReturnType<typeof noCursor>;
export type HighlightCursor = ReturnType<typeof highlightCursor>;
export type Cursor = LineCursor | NoCursor | HighlightCursor;

/**
 * This is the most complex, tricky function in the whole repo.
 */
export function computeDrop(args: Args): ComputedDrop {
  const hover = measureHover(args.element, args.offset);

  const indent = args.indent;
  const hoverLevel = Math.round(Math.max(0, hover.x - indent) / indent);
  const { node, nextNode, prevNode } = args;
  const [above, below] = getNodesAroundCursor(node, prevNode, nextNode, hover);
  const targetTree = args.targetTree;

  /* Hovering over the middle of a folder */
  if (node && node.isInternal && hover.inMiddle) {
    return {
      drop: dropAt(node.id, null, targetTree),
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
      drop: dropAt(below?.parent?.id, 0, targetTree),
      cursor: lineCursor(0, 0),
    };
  }

  /* The node above the cursor line is an item */
  if (isItem(above)) {
    const level = bound(hoverLevel, below?.level || 0, above.level);
    return {
      drop: walkUpFrom(above, level, targetTree),
      cursor: lineCursor(above.rowIndex! + 1, level),
    };
  }

  /* The node above the cursor line is a closed folder */
  if (isClosed(above)) {
    const level = bound(hoverLevel, below?.level || 0, above.level);
    return {
      drop: walkUpFrom(above, level, targetTree),
      cursor: lineCursor(above.rowIndex! + 1, level),
    };
  }

  /* The node above the cursor line is an open folder with no children */
  if (isOpenWithEmptyChildren(above)) {
    const level = bound(hoverLevel, 0, above.level + 1);
    if (level > above.level) {
      /* Will be the first child of the empty folder */
      return {
        drop: dropAt(above.id, 0, targetTree),
        cursor: lineCursor(above.rowIndex! + 1, level),
      };
    } else {
      /* Will be a sibling or grandsibling of the empty folder */
      return {
        drop: walkUpFrom(above, level, targetTree),
        cursor: lineCursor(above.rowIndex! + 1, level),
      };
    }
  }

  /* The node above the cursor is a an open folder with children */
  return {
    drop: dropAt(above?.id, 0, targetTree),
    cursor: lineCursor(above.rowIndex! + 1, above.level + 1),
  };
}
