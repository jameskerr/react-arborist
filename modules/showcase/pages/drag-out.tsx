import { useState } from "react";
import { NodeRendererProps, Tree } from "react-arborist";
import { DndProvider, useDragDropManager, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Link from "next/link";

type Item = { id: string; name: string; children?: Item[] };

const data: Item[] = [
  {
    id: "documents",
    name: "Documents",
    children: [
      { id: "report", name: "report.txt" },
      { id: "notes", name: "notes.txt" },
    ],
  },
  {
    id: "downloads",
    name: "Downloads",
    children: [{ id: "installer", name: "installer.dmg" }],
  },
];

export default function DragOut() {
  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Drag Nodes Out of the Tree</h1>
      <p>
        The dragged node&apos;s data rides along on the react-dnd drag item, so a drop target
        outside the tree can read it. Both the tree and the drop zone below share one react-dnd
        backend (via the <code>dndManager</code> prop), and the drop zone accepts the default{" "}
        <code>&quot;NODE&quot;</code> type. Internal reordering still works.
      </p>
      {/* One DndProvider wraps both the tree and the external drop target so they
          share a backend; the tree reuses it through the dndManager prop. */}
      <DndProvider backend={HTML5Backend}>
        <DragOutDemo />
      </DndProvider>
      <p style={{ marginTop: 24 }}>
        <Link href="/">Back to Demos</Link>
      </p>
    </div>
  );
}

function DragOutDemo() {
  const manager = useDragDropManager();
  const [dropped, setDropped] = useState<string[]>([]);

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      <Tree
        initialData={data}
        openByDefault
        width={300}
        height={300}
        indent={20}
        rowHeight={32}
        dndManager={manager}
      >
        {Node}
      </Tree>
      <DropZone dropped={dropped} onDrop={(name) => setDropped((prev) => [...prev, name])} />
    </div>
  );
}

function Node({ node, style, dragHandle }: NodeRendererProps<Item>) {
  return (
    <div
      ref={dragHandle}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        paddingLeft: 8,
        background: node.isSelected ? "#e0ecff" : undefined,
        cursor: "grab",
      }}
      onClick={() => node.isInternal && node.toggle()}
    >
      {node.isInternal ? (node.isOpen ? "📂" : "📁") : "📄"}
      <span style={{ marginLeft: 6 }}>{node.data.name}</span>
    </div>
  );
}

function DropZone({ dropped, onDrop }: { dropped: string[]; onDrop: (name: string) => void }) {
  const [{ isOver }, drop] = useDrop<{ data: Item }, void, { isOver: boolean }>(() => ({
    accept: "NODE",
    drop: (item) => onDrop(item.data.name),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }));

  return (
    <div
      ref={drop}
      data-testid="drop-zone"
      style={{
        width: 220,
        minHeight: 300,
        padding: 12,
        border: "2px dashed #9aa5b1",
        borderRadius: 8,
        background: isOver ? "#eef6ff" : "#fafafa",
      }}
    >
      <b>Dropped here</b>
      {dropped.length === 0 ? (
        <p style={{ color: "#9aa5b1" }}>Drag any node onto this zone.</p>
      ) : (
        <ul style={{ paddingLeft: 18 }}>
          {dropped.map((name, i) => (
            <li key={i}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
