import { TreeApi } from "../interfaces/tree-api";
import { TreeProps } from "../types/tree-props";
import { RootState } from "./root-reducer";

export const initialState = (props?: TreeProps<any>): RootState => ({
  nodes: {
    // Changes together
    open: { filtered: {}, unfiltered: props?.initialOpenState ?? {} },
    focus: { id: null, treeFocused: false },
    edit: { id: null },
    drag: {
      id: null,
      selectedIds: [],
      destinationParentId: null,
      destinationIndex: null,
      
    },
    selection: { ids: new Set(), anchor: null, mostRecent: null },
  },
  dnd: {
    cursor: { type: "none" },
    dragId: null,
    dragIds: [],
    parentId: null,
    index: -1,
    sourceTreeId: "",
    lastTree: null
  },
});
