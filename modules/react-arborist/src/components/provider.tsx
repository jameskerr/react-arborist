import { ReactNode, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import { FixedSizeList, VariableSizeList } from "react-window";
import { createStore, Store } from "redux";
import { DndProvider } from "react-dnd";
import { DataUpdatesContext, DndContext, NodesContext, TreeApiContext } from "../context";
import { TreeApi } from "../interfaces/tree-api";
import { initialState } from "../state/initial";
import { Actions, rootReducer, RootState } from "../state/root-reducer";
import { actions as visibility } from "../state/open-slice";
import { TreeProps } from "../types/tree-props";

/* react-dnd-html5-backend is an optional peer dependency — only required when
   neither dndBackend nor dndManager is provided. Lazy-require so that projects
   using a custom backend don't need to install it at all. */
function getDefaultBackend() {
  // Pure-ESM module contexts (e.g. the dist/module build loaded as an ES module)
  // don't have require(). Bundlers (webpack/vite) resolve this at build time, but
  // unbundled ESM consumers must pass dndBackend or dndManager explicitly.
  if (typeof require === "undefined") {
    throw new Error(
      "[react-arborist] Cannot auto-load react-dnd-html5-backend in a pure-ESM " +
        "module context. Pass your backend explicitly: " +
        "<Tree dndBackend={HTML5Backend} /> or <Tree dndManager={manager} />.",
    );
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-dnd-html5-backend").HTML5Backend;
  } catch {
    throw new Error(
      "[react-arborist] react-dnd-html5-backend is not installed. " +
        "Either install it (`npm install react-dnd-html5-backend`) or pass a " +
        "custom backend via the `dndBackend` prop, or share an existing " +
        "DragDropManager via the `dndManager` prop.",
    );
  }
}

type Props<T> = {
  treeProps: TreeProps<T>;
  imperativeHandle: React.Ref<TreeApi<T> | undefined>;
  children: ReactNode;
};

const SERVER_STATE = initialState();

export function TreeProvider<T>({ treeProps, imperativeHandle, children }: Props<T>) {
  const list = useRef<FixedSizeList | VariableSizeList | null>(null);
  const listEl = useRef<HTMLDivElement | null>(null);
  const store = useRef<Store<RootState, Actions>>(
    // @ts-expect-error Redux 5 tightened createStore's PreloadedState generic;
    // rootReducer is typed without it (v4-style). Migrate to configureStore to remove this.
    createStore(rootReducer, initialState(treeProps)),
  );
  const state = useSyncExternalStore<RootState>(
    store.current.subscribe,
    store.current.getState,
    () => SERVER_STATE,
  );

  /* The tree api object is stable. */
  const api = useMemo(() => {
    return new TreeApi<T>(store.current, treeProps, list, listEl);
  }, []);

  /* Make sure the tree instance stays in sync */
  const updateCount = useRef(0);
  useMemo(() => {
    updateCount.current += 1;
    api.update(treeProps);
  }, Object.values(treeProps));

  /* Rebuild visible nodes when open state changes, without clobbering
     props set imperatively via api.update(). Bumping updateCount keeps
     DataUpdates consumers (e.g. DefaultContainer) in sync. */
  useMemo(() => {
    updateCount.current += 1;
    api.update(api.props);
  }, [state.nodes.open]);

  /* Expose the tree api */
  useImperativeHandle(imperativeHandle, () => api);

  /* Change selection based on props */
  useEffect(() => {
    if (api.props.selection) {
      api.select(api.props.selection, { focus: false });
    } else {
      api.deselectAll();
    }
  }, [api.props.selection]);

  /* Clear visability for filtered nodes */
  useEffect(() => {
    if (!api.props.searchTerm) {
      store.current.dispatch(visibility.clear(true));
    }
  }, [api.props.searchTerm]);

  const dndProps = treeProps.dndManager
    ? { manager: treeProps.dndManager }
    : {
        backend: treeProps.dndBackend ?? getDefaultBackend(),
        options: { rootElement: api.props.dndRootElement ?? undefined },
      };

  return (
    <TreeApiContext.Provider value={api}>
      <DataUpdatesContext.Provider value={updateCount.current}>
        <NodesContext.Provider value={state.nodes}>
          <DndContext.Provider value={state.dnd}>
            <DndProvider {...dndProps}>{children}</DndProvider>
          </DndContext.Provider>
        </NodesContext.Provider>
      </DataUpdatesContext.Provider>
    </TreeApiContext.Provider>
  );
}
