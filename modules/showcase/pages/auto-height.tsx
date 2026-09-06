import { useState } from "react";
import { NodeRendererProps, Tree } from "react-arborist";
import Link from "next/link";

type Item = { id: string; name: string; children?: Item[] };

/* Eight nodes when open: three folders and five leaves. */
const folders: Item[] = [
  {
    id: "documents",
    name: "Documents",
    children: [
      { id: "report", name: "report.txt" },
      { id: "notes", name: "notes.txt" },
    ],
  },
  {
    id: "images",
    name: "Images",
    children: [
      { id: "photo", name: "photo.png" },
      { id: "diagram", name: "diagram.svg" },
    ],
  },
  {
    id: "downloads",
    name: "Downloads",
    children: [{ id: "installer", name: "installer.dmg" }],
  },
];

const many: Item[] = Array.from({ length: 100 }, (_, i) => ({
  id: `item-${i}`,
  name: `Item ${i}`,
}));

const ROW_HEIGHT = 24;

export default function AutoHeight() {
  const [tallParent, setTallParent] = useState(false);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 720 }}>
      <h1>Auto Height</h1>
      <p>
        The <code>height</code> prop takes a number of pixels, any CSS value, or{" "}
        <code>&quot;auto&quot;</code>. CSS values are measured, so the tree can fill its parent
        without a resize observer of your own.
      </p>

      <h2>
        Fill the parent — <code>height=&quot;100%&quot;</code>
      </h2>
      <p>
        The tree fills its parent box and stays virtualized: only the rows in view are rendered.
        Resize the parent and the tree follows.
      </p>
      <button data-cy="resize-parent" onClick={() => setTallParent((tall) => !tall)}>
        {tallParent ? "Shrink parent" : "Grow parent"}
      </button>
      <div data-cy="fill" style={{ ...box, height: tallParent ? 480 : 240, marginTop: 8 }}>
        <Tree initialData={many} width="100%" height="100%" rowHeight={ROW_HEIGHT} indent={20}>
          {Node}
        </Tree>
      </div>

      <h2>
        Grow to fit — <code>height=&quot;auto&quot;</code>
      </h2>
      <p>
        The tree is exactly as tall as its rows, so the page scrolls instead of the tree. Toggle a
        folder and the tree resizes. Every visible row renders in this mode, so keep it for small
        trees or pair it with <code>maxHeight</code>.
      </p>
      <div data-cy="auto" style={{ ...box, height: "auto" }}>
        <Tree
          initialData={folders}
          openByDefault
          width="100%"
          height="auto"
          rowHeight={ROW_HEIGHT}
          indent={20}
        >
          {Node}
        </Tree>
      </div>

      <h2>
        Grow to a limit — <code>maxHeight</code>
      </h2>
      <p>
        With a cap, the tree grows to fit its rows and stops, scrolling beyond that. The list stays
        virtualized because the cap bounds it.
      </p>
      <div data-cy="capped" style={{ ...box, height: "auto" }}>
        <Tree
          initialData={folders}
          openByDefault
          width="100%"
          height="auto"
          maxHeight={120}
          rowHeight={ROW_HEIGHT}
          indent={20}
        >
          {Node}
        </Tree>
      </div>

      <h2>
        Grow to the parent — <code>maxHeight=&quot;100%&quot;</code>
      </h2>
      <p>
        A CSS cap is measured like a CSS height, so the tree is as tall as its rows or its parent,
        whichever is shorter.
      </p>
      <div data-cy="css-capped" style={{ ...box, height: 120 }}>
        <Tree
          initialData={folders}
          openByDefault
          width="100%"
          height="auto"
          maxHeight="100%"
          rowHeight={ROW_HEIGHT}
          indent={20}
        >
          {Node}
        </Tree>
      </div>

      <p style={{ marginTop: 24 }}>
        <Link href="/">Back to Demos</Link>
      </p>
    </div>
  );
}

/* Outlined rather than bordered: an outline doesn't take up layout space, so
   the parent's stated height is the height the tree measures. */
const box = {
  width: 360,
  outline: "1px solid #ccc",
  borderRadius: 4,
};

function Node({ node, style, dragHandle }: NodeRendererProps<Item>) {
  return (
    <div
      ref={dragHandle}
      style={{
        ...style,
        height: "100%",
        display: "flex",
        alignItems: "center",
        paddingLeft: 8,
        fontSize: 14,
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
