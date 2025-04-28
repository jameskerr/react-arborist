import React from "react";
import { RowRendererProps } from "../types/renderers";
import { IdObj } from "../types/utils";

export function DefaultRow<T>({
  node,
  attrs,
  innerRef,
  children,
}: RowRendererProps<T>) {
  return (
    <div
      {...attrs}
      ref={innerRef}
      onFocus={(e) => e.stopPropagation()}
      onClick={node.handleClick}
      onKeyUp={node.handleKeyUp}
    >
      {children}
    </div>
  );
}
