import { NodeApi, NodeRendererProps, Tree } from "react-arborist";
import Link from "next/link";

type Item = { id: string; name: string; children?: Item[] };

const data: Item[] = [
  {
    id: "documents",
    name: "Documents",
    children: [
      { id: "report", name: "report.txt" },
      { id: "notes", name: "notes.txt" },
      {
        id: "images",
        name: "Images",
        children: [
          { id: "photo", name: "photo.png" },
          { id: "diagram", name: "diagram.svg" },
        ],
      },
    ],
  },
  {
    id: "downloads",
    name: "Downloads",
    children: [{ id: "installer", name: "installer.dmg" }],
  },
];

/* Internal nodes (folders) render taller than leaves. */
const rowHeight = (node: NodeApi<Item>) => (node.isInternal ? 48 : 28);

export default function VariableHeight() {
  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Variable Row Height</h1>
      <p>
        Pass <code>rowHeight</code> a function to size each row based on its node. Here, folders are
        48px and leaves are 28px. Toggle and drag rows — the virtualized list recomputes offsets
        automatically.
      </p>
      <Tree
        initialData={data}
        openByDefault
        width={360}
        height={400}
        indent={20}
        rowHeight={rowHeight}
      >
        {Node}
      </Tree>
      <p style={{ marginTop: 24 }}>
        <Link href="/">Back to Demos</Link>
      </p>
    </div>
  );
}

function Node({ node, style, dragHandle }: NodeRendererProps<Item>) {
  return (
    <div
      ref={dragHandle}
      style={{
        ...style,
        /* react-window applies the row height to the outer treeitem; fill it so
           the whole row (not just the text) is clickable. */
        height: "100%",
        display: "flex",
        alignItems: "center",
        paddingLeft: 8,
        fontSize: node.isInternal ? 18 : 14,
        fontWeight: node.isInternal ? 600 : 400,
        background: node.isSelected ? "#e0ecff" : undefined,
        cursor: "pointer",
      }}
      onClick={() => node.isInternal && node.toggle()}
    >
      {node.isInternal ? (node.isOpen ? "📂" : "📁") : "📄"}
      <span style={{ marginLeft: 6 }}>{node.data.name}</span>
    </div>
  );
}
