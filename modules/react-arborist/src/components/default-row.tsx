import React from "react";
import { RowRendererProps } from "../types/renderers";

export function DefaultRow<T>({ node, attrs, innerRef, children }: RowRendererProps<T>) {
  return (
    <div {...attrs} ref={innerRef} onFocus={(e) => e.stopPropagation()} onClick={node.handleClick}>
      {children}
    </div>
  );
}
