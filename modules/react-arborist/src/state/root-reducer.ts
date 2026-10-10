import { ActionFromReducer, combineReducers } from "redux";
import { reducer as focus } from "./focus-slice.js";
import { reducer as edit } from "./edit-slice.js";
import { reducer as dnd } from "./dnd-slice.js";
import { reducer as selection } from "./selection-slice.js";
import { reducer as open } from "./open-slice.js";
import { reducer as drag } from "./drag-slice.js";

export const rootReducer = combineReducers({
  nodes: combineReducers({
    focus,
    edit,
    open,
    selection,
    drag,
  }),
  dnd,
});

export type RootState = ReturnType<typeof rootReducer>;
export type Actions = ActionFromReducer<typeof rootReducer>;
