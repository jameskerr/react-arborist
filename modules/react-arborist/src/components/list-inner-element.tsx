import React from "react";
import { forwardRef } from "react";
import { useTreeApi } from "../context";

export const ListInnerElement = forwardRef<any, any>(function InnerElement(
  { style, ...rest },
  ref,
) {
  const tree = useTreeApi();
  const paddingTop = tree.props.padding ?? tree.props.paddingTop ?? 0;
  const paddingBottom = tree.props.padding ?? tree.props.paddingBottom ?? 0;
  return (
    <div
      ref={ref}
      style={{
        ...style,
        height: `${parseFloat(style.height) + paddingTop + paddingBottom}px`,
      }}
      {...rest}
    />
  );
});
