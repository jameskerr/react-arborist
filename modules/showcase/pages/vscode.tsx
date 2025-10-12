import useResizeObserver from "use-resize-observer";
import styles from "../styles/vscode.module.css";
import { NodeRendererProps, Tree } from "@jorgedanisc/react-arborist";
import { SiTypescript } from "react-icons/si";
import { MdFolder } from "react-icons/md";
import clsx from "clsx";

let id = 1;

type Entry = { name: string; id: string; children?: Entry[] };

const nextId = () => (id++).toString();
const file = (name: string) => ({ name, id: nextId() });
const folder = (name: string, ...children: Entry[]) => ({
  name,
  id: nextId(),
  children,
});

const structure = [
  folder(
    "src",
    file("index.ts"),
    folder(
      "lib",
      file("index.ts"),
      file("worker.ts"),
      file("utils.ts"),
      file("model.ts")
    ),
    folder(
      "ui",
      file("button.ts"),
      file("form.ts"),
      file("table.ts"),
      folder(
        "demo",
        file("welcome.ts"),
        file("example.ts"),
        file("container.ts")
      )
    )
  ),
];

function sortChildren(node: Entry): Entry {
  if (!node.children) return node;
  const copy = [...node.children];
  copy.sort((a, b) => {
    if (!!a.children && !b.children) return -1;
    if (!!b.children && !a.children) return 1;
    return a.name < b.name ? -1 : 1;
  });
  const children = copy.map(sortChildren);
  return { ...node, children };
}

function useTreeSort(data: Entry[]) {
  return data.map(sortChildren);
}

function Node({ style, node, dragHandle, tree }: NodeRendererProps<Entry>) {
  return (
    <div
      style={style}
      className={clsx(styles.node, node.state, {
        [styles.highlight]:
          tree.dragDestinationParent?.isAncestorOf(node) &&
          tree.dragDestinationParent?.id !== tree.dragNode?.parent?.id,
      })}
      ref={dragHandle}
    >
      {node.isInternal ? <MdFolder /> : <SiTypescript />}
      {node.data.name} {node.id}
    </div>
  );
}

export default function VSCodeDemoPage() {
  const { width, height, ref } = useResizeObserver();

  const data = useTreeSort(structure);

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar} ref={ref}>
        <Tree
          data={data}
          width={width}
          height={height}
          rowHeight={22}
          onMove={() => {}}
          renderCursor={() => null}
        >
          {Node}
        </Tree>
      </aside>
      <main className={styles.main}></main>
    </div>
  );
}
