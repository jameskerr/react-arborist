import { createStore } from "redux";
import { rootReducer } from "../state/root-reducer";
import { TreeProps } from "../types/tree-props";
import { TreeApi } from "./tree-api";

function setupApi(props: TreeProps<any>) {
  const store = createStore(rootReducer);
  return new TreeApi(store, props, { current: null }, { current: null });
}


// Can drop now accepts drops from other trees, so not sure how to test this...
// test("tree.canDrop()", () => {
//   expect(setupApi({ disableDrop: true }).canDrop()).toBe(false);
//   expect(setupApi({ disableDrop: () => false }).canDrop()).toBe(true);
//   expect(setupApi({ disableDrop: false }).canDrop()).toBe(true);
// });
