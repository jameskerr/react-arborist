import { useState } from "react";
import { NodeRendererProps, Tree, treeCollisionDetection } from "react-arborist";
import { DndContext, DragEndEvent, useDroppable } from "@dnd-kit/core";
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
        The dragged node&apos;s data rides along on the @dnd-kit draggable data, so a drop target
        outside the tree can read it. Both the tree and the drop zone below share one DndContext,
        and the drop zone accepts drops from the tree. Internal reordering still works.
      </p>
      <DragOutDemo />
      <p style={{ marginTop: 24 }}>
        <Link href="/">Back to Demos</Link>
      </p>
    </div>
  );
}

function DragOutDemo() {
  const [dropped, setDropped] = useState<string[]>([]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id === "drop-zone") {
      const name = event.active.data.current?.data?.name;
      if (name) {
        setDropped((prev) => [...prev, name]);
      }
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={treeCollisionDetection}>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <Tree initialData={data} openByDefault width={300} height={300} indent={20} rowHeight={32}>
          {Node}
        </Tree>
        <DropZone dropped={dropped} />
      </div>
    </DndContext>
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

function DropZone({ dropped }: { dropped: string[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
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
