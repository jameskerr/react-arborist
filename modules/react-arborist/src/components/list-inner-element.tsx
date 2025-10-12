import React from "react";
import { forwardRef } from "react";
import { useTreeApi } from "../context";

export const ListInnerElement = forwardRef<any, any>(function InnerElement(
  { style, ...rest },
  ref
) {
  const tree = useTreeApi();
  const paddingTop = tree.paddingTop;
  const paddingBottom = tree.paddingBottom;
  return (
    <div
      ref={ref}
      style={{
        ...style,
        height: `${parseFloat(style.height) + paddingTop + paddingBottom}px`,
        width: `${parseFloat(style.width) + tree.paddingLeft + tree.paddingRight}px`,
      }}
      {...rest}
    />
  );
});
