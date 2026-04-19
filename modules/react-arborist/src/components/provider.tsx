import {
  ReactNode,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import { FixedSizeList } from "react-window";
import {
  DataUpdatesContext,
  DndContext,
  NodesContext,
  TreeApiContext,
} from "../context";
import { TreeApi } from "../interfaces/tree-api";
import { initialState } from "../state/initial";
import { Actions, rootReducer, RootState } from "../state/root-reducer";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";
import { TreeProps } from "../types/tree-props";
import { createStore, Store } from "redux";
import { actions as visibility } from "../state/open-slice";

type Props<T> = {
  treeProps: TreeProps<T>;
  imperativeHandle: React.Ref<TreeApi<T> | undefined>;
  children: ReactNode;
};

const SERVER_STATE = initialState();

export function TreeProvider<T>({
  treeProps,
  imperativeHandle,
  children,
}: Props<T>) {
  const list = useRef<FixedSizeList | null>(null);
  const listEl = useRef<HTMLDivElement | null>(null);
  const store = useRef<Store<RootState, Actions>>(
    // @ts-ignore
    createStore(rootReducer, initialState(treeProps))
  );
  const state = useSyncExternalStore<RootState>(
    store.current.subscribe,
    store.current.getState,
    () => SERVER_STATE
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
  }, [...Object.values(treeProps), state.nodes.open]);

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

  return (
    <TreeApiContext.Provider value={api}>
      <DataUpdatesContext.Provider value={updateCount.current}>
        <NodesContext.Provider value={state.nodes}>
          <DndContext.Provider value={state.dnd}>
            <DndProvider
              {...(treeProps.dndManager
                ? { manager: treeProps.dndManager }
                : {
                    backend: HTML5Backend,
                    options: {
                      rootElement: api.props.dndRootElement || undefined,
                    },
                  })}
            >
              {children}
            </DndProvider>
          </DndContext.Provider>
        </NodesContext.Provider>
      </DataUpdatesContext.Provider>
    </TreeApiContext.Provider>
  );
}
