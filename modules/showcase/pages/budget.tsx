import { useState } from "react";
import { adjustMoveIndex, MoveHandler, NodeRendererProps, Tree } from "react-arborist";
import Link from "next/link";
import styles from "../styles/budget.module.css";

type Item = { id: string; name: string; amount?: number; children?: Item[] };

const initialData: Item[] = [
  {
    id: "housing",
    name: "Housing",
    children: [
      { id: "rent", name: "Rent", amount: 1800 },
      {
        id: "utilities",
        name: "Utilities",
        children: [
          { id: "electric", name: "Electric", amount: 95 },
          { id: "water", name: "Water", amount: 40 },
          { id: "internet", name: "Internet", amount: 60 },
        ],
      },
    ],
  },
  {
    id: "food",
    name: "Food",
    children: [
      { id: "groceries", name: "Groceries", amount: 450 },
      { id: "dining", name: "Dining Out", amount: 180 },
    ],
  },
  {
    id: "transportation",
    name: "Transportation",
    children: [
      { id: "car", name: "Car Payment", amount: 320 },
      { id: "gas", name: "Gas", amount: 140 },
    ],
  },
  { id: "entertainment", name: "Entertainment", children: [] },
  { id: "streaming", name: "Streaming", amount: 35 },
  { id: "gym", name: "Gym", amount: 55 },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function total(item: Item): number {
  return item.children ? item.children.reduce((sum, c) => sum + total(c), 0) : (item.amount ?? 0);
}

export default function Budget() {
  const [data, setData] = useState(initialData);

  const onMove: MoveHandler<Item> = ({ dragIds, parentId, index }) => {
    setData((prev) => moveItems(prev, dragIds, parentId, index));
  };

  return (
    <div className={styles.page}>
      <h1>Budget Tree</h1>
      <p>
        Each expense shows its monthly amount, and each folder shows the sum of everything inside
        it. The tree is controlled: <code>onMove</code> produces new data, and the totals are
        derived from that data on every render, so dragging an expense into another folder updates
        both folders&apos; totals.
      </p>
      <div className={styles.layout}>
        <Tree
          data={data}
          onMove={onMove}
          openByDefault
          width={360}
          height={500}
          indent={20}
          rowHeight={32}
          className={styles.tree}
        >
          {Node}
        </Tree>
        <div className={styles.summary}>
          <label>Monthly total</label>
          <div className={styles.grandTotal} data-testid="grand-total">
            {currency.format(data.reduce((sum, d) => sum + total(d), 0))}
          </div>
          <p>
            Drag expenses between folders (or out to the top level) and watch the folder totals
            follow. The grand total stays the same, since moving an expense doesn&apos;t change how
            much you spend.
          </p>
        </div>
      </div>
      <p>
        <Link href="/">Back to Demos</Link>
      </p>
    </div>
  );
}

function Node({ node, style, dragHandle }: NodeRendererProps<Item>) {
  return (
    <div
      ref={dragHandle}
      style={style}
      className={styles.node}
      data-selected={node.isSelected || undefined}
      onClick={() => node.isInternal && node.toggle()}
    >
      <span className={styles.icon}>{node.isInternal ? (node.isOpen ? "📂" : "📁") : "💵"}</span>
      <span className={styles.name}>{node.data.name}</span>
      <span className={node.isInternal ? styles.folderAmount : styles.amount} data-testid="amount">
        {currency.format(total(node.data))}
      </span>
    </div>
  );
}

/* Returns new data with the dragged items moved under `parentId` at `index`,
   leaving the input untouched. */
function moveItems(
  data: Item[],
  dragIds: string[],
  parentId: string | null,
  index: number,
): Item[] {
  const siblings = parentId ? (find(data, parentId)?.children ?? []) : data;
  const to = adjustMoveIndex({ index, dragIds, siblingIds: siblings.map((s) => s.id) });

  // A single depth-first pass, so the dragged items keep their display order
  // even when the selection spans different depths.
  const dragged: Item[] = [];
  const remove = (items: Item[]): Item[] => {
    const kept: Item[] = [];
    for (const item of items) {
      if (dragIds.includes(item.id)) dragged.push(item);
      else kept.push(item.children ? { ...item, children: remove(item.children) } : item);
    }
    return kept;
  };

  const insert = (items: Item[]): Item[] =>
    items.map((item) => {
      if (!item.children) return item;
      const children = insert(item.children);
      if (item.id === parentId) children.splice(to, 0, ...dragged);
      return { ...item, children };
    });

  const rest = remove(data);
  if (parentId === null) {
    rest.splice(to, 0, ...dragged);
    return rest;
  }
  return insert(rest);
}

function find(items: Item[], id: string): Item | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const found = item.children && find(item.children, id);
    if (found) return found;
  }
}
