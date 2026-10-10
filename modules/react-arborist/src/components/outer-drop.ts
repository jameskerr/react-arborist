import { ReactElement } from "react";
import { useOuterDrop } from "../dnd/outer-drop-hook.js";

export function OuterDrop(props: { children: ReactElement }) {
  useOuterDrop();
  return props.children;
}
