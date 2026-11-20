import type { TreeProps } from "../types/tree-props.js";
import { RootState } from "./root-reducer.js";

export const initialState = (props?: TreeProps<any>): RootState => ({
  nodes: {
    // Changes together
    open: { filtered: {}, unfiltered: props?.initialOpenState ?? {} },
    focus: { id: null, treeFocused: false },
    edit: { id: null },
    drag: {
      id: null,
      selectedIds: [],
    },
    selection: { ids: new Set(), anchor: null, mostRecent: null },
  },
  dnd: {
    cursor: { type: "none" },
    dragId: null,
    dragIds: [],
    parentId: null,
    index: -1,
    destinationParentId: null,
    destinationIndex: null,
  },
});
