import clsx from "clsx";
import {
  CursorProps,
  NodeApi,
  NodeRendererProps,
  Tree,
} from "react-arborist";
import { MultiTreeItem, tree1Data, tree2Data, tree3Data } from "../data/multitree";
import styles from "../styles/MultiTree.module.css";
import { BsTree } from "react-icons/bs";
import Link from "next/link";

export default function GmailSidebar() {

  return (
    <div className={styles.page}>

      <div className={styles.top}>
        <h1>React Arborist Multiple Tree Demo</h1>
        <p className={styles.mobileWarning}>
            Heads up! <br />
            This site works best on a desktop screen.
        </p>
        <p>
            React Arborist supports multiple trees, with drag and drop between them.
        </p>
        <p>Drag items or folders between the trees. The tree at the far right has both cross tree dragging and dropping disabled.
          These properties are independent so it is possible to drag from a tree but not drop on it and vice versa.
        </p>
      </div>


      <div>
        <div className={styles.trees}>
          <div>
            <h3>Tree 1</h3>
            <Tree
              id='tree1'
              initialData={tree1Data}
              width={300}
              height={500}
              rowHeight={32}
              renderCursor={Cursor}
              paddingBottom={32}
            >
              {Node}
            </Tree>
          </div>
          <div>
            <h3>Tree 2</h3>
            <Tree
              id='tree2'
              initialData={tree2Data}
              width={300}
              height={500}
              rowHeight={32}
              renderCursor={Cursor}
              paddingBottom={32}
            >
              {Node}
            </Tree>
          </div>
          <div>
            <h3>Tree 3 - cross tree drag and drop disabled</h3>
            <Tree
              id='tree3'
              allowCrossTreeDrop={false}
              allowCrossTreeDrag={false}
              initialData={tree3Data}
              width={300}
              height={500}
              rowHeight={32}
              renderCursor={Cursor}
              paddingBottom={32}
            >
              {Node}
            </Tree>
          </div>          
        </div>


        <div className={styles.top}>
          <p>
            Star it on{" "}
            <a href="https://github.com/brimdata/react-arborist">Github</a> (The
            docs are there too).
          </p>
          <p>
            Follow updates on{" "}
            <a href="https://twitter.com/specialCaseDev">Twitter</a>.
          </p>

          <p>
            <Link href="/">Back to Demos</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Node({ node, style, dragHandle }: NodeRendererProps<MultiTreeItem>) {
  const Icon = BsTree;
  return (
    <div
      ref={dragHandle}
      style={style}
      className={clsx(styles.node, node.state)}
      onClick={() => node.isInternal && node.toggle()}
    >
      <span>
        <Icon />
      </span>
      <span>{node.data.name}</span>
    </div>
  );
}

function Cursor({ top, left }: CursorProps) {
  return <div className={styles.dropCursor} style={{ top, left }}></div>;
}
