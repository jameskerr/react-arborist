export type SimpleTreeOptions<T> = {
  idAccessor?: string | ((d: T) => string);
  childrenAccessor?: string | ((d: T) => readonly T[] | null | undefined);
};

/* Resolved id/children readers plus the string key the controller writes
   children back under. A string accessor is used for both reading and writing;
   a function accessor can only be read, so writes fall back to "children".
   This is what lets initialData honor idAccessor/childrenAccessor (issue #73):
   without it, the controller assumed `id`/`children` and silently dropped moves
   for trees keyed differently. */
type Accessors<T> = {
  getId: (data: T) => string;
  getChildren: (data: T) => readonly T[] | null | undefined;
  childrenKey: string;
};

function resolveAccessors<T>(options: SimpleTreeOptions<T> = {}): Accessors<T> {
  const id = options.idAccessor ?? "id";
  const children = options.childrenAccessor ?? "children";
  return {
    getId: typeof id === "function" ? id : (data) => (data as any)[id],
    getChildren: typeof children === "function" ? children : (data) => (data as any)[children],
    childrenKey: typeof children === "string" ? children : "children",
  };
}

export class SimpleTree<T> {
  root: SimpleNode<T>;
  private accessors: Accessors<T>;

  constructor(data: T[], options: SimpleTreeOptions<T> = {}) {
    this.accessors = resolveAccessors(options);
    this.root = createRoot<T>(data, this.accessors);
  }

  get data() {
    return this.root.children?.map((node) => node.data) ?? [];
  }

  create(args: { parentId: string | null; index: number; data: T }) {
    const parent = args.parentId ? this.find(args.parentId) : this.root;
    if (!parent) return null;
    parent.addChild(args.data, args.index);
  }

  move(args: { id: string; parentId: string | null; index: number }) {
    const src = this.find(args.id);
    const parent = args.parentId ? this.find(args.parentId) : this.root;
    if (!src || !parent) return;
    parent.addChild(src.data, args.index);
    src.drop();
  }

  update(args: { id: string; changes: Partial<T> }) {
    const node = this.find(args.id);
    if (node) node.update(args.changes);
  }

  drop(args: { id: string }) {
    const node = this.find(args.id);
    if (node) node.drop();
  }

  find(id: string, node: SimpleNode<T> = this.root): SimpleNode<T> | null {
    if (!node) return null;
    if (node.id === id) return node as SimpleNode<T>;
    if (node.children) {
      for (let child of node.children) {
        const found = this.find(id, child);
        if (found) return found;
      }
      return null;
    }
    return null;
  }
}

function createRoot<T>(data: T[], accessors: Accessors<T>) {
  // The synthetic root has no real data, so it gets an explicit id rather than
  // running the user's accessor on `{}` — a function accessor that reaches into
  // the data (e.g. `d => d.meta.id`) would otherwise throw during construction.
  const root = new SimpleNode<T>({} as T, null, accessors, "ROOT");
  root.children = data.map((d) => createNode(d, root, accessors));
  return root;
}

function createNode<T>(data: T, parent: SimpleNode<T>, accessors: Accessors<T>) {
  const node = new SimpleNode<T>(data, parent, accessors);
  const children = accessors.getChildren(data);
  if (children) node.children = children.map((d) => createNode<T>(d, node, accessors));
  return node;
}

class SimpleNode<T> {
  id: string;
  children?: SimpleNode<T>[];
  constructor(
    public data: T,
    public parent: SimpleNode<T> | null,
    private accessors: Accessors<T>,
    id?: string,
  ) {
    this.id = id ?? accessors.getId(data);
  }

  hasParent(): this is this & { parent: SimpleNode<T> } {
    return !!this.parent;
  }

  get childIndex(): number {
    return this.hasParent() ? this.parent.children!.indexOf(this) : -1;
  }

  addChild(data: T, index: number) {
    const node = createNode(data, this, this.accessors);
    this.children = this.children ?? [];
    this.children.splice(index, 0, node);
    const key = this.accessors.childrenKey;
    const raw = this.data as any;
    raw[key] = raw[key] ?? [];
    raw[key].splice(index, 0, data);
  }

  removeChild(index: number) {
    this.children?.splice(index, 1);
    const raw = this.data as any;
    raw[this.accessors.childrenKey]?.splice(index, 1);
  }

  update(changes: Partial<T>) {
    if (this.hasParent()) {
      const i = this.childIndex;
      this.parent.addChild({ ...this.data, ...changes }, i);
      this.drop();
    }
  }

  drop() {
    if (this.hasParent()) this.parent.removeChild(this.childIndex);
  }
}
