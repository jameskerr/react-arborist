import { TreeProps } from "../types/tree-props.js";
import type { RootState } from "./root-reducer.js";
import { initialDndState } from "./dnd-slice.js";
import { initialDragState } from "./drag-slice.js";
import { initialSelectionState } from "./selection-slice.js";

export const initialState = (props?: TreeProps<any>): RootState => ({
  nodes: {
    // Changes together
    open: { filtered: {}, unfiltered: props?.initialOpenState ?? {} },
    focus: { id: null, treeFocused: false },
    edit: { id: null },
    drag: initialDragState,
    selection: initialSelectionState,
  },
  dnd: initialDndState,
});
