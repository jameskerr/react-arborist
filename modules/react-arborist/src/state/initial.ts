import type { TreeProps } from "../types/tree-props.js";
import type { RootState } from "./root-reducer.js";
import { initialDndState } from "./dnd-slice.js";
import { initialDragState } from "./drag-slice.js";
import { initialEditState } from "./edit-slice.js";
import { initialFocusState } from "./focus-slice.js";
import { initialOpenState } from "./open-slice.js";
import { initialSelectionState } from "./selection-slice.js";

export const initialState = (props?: TreeProps<any>): RootState => ({
  nodes: {
    // Changes together
    open: initialOpenState(props?.initialOpenState),
    focus: initialFocusState(),
    edit: initialEditState(),
    drag: initialDragState(),
    selection: initialSelectionState(),
  },
  dnd: initialDndState(),
});
