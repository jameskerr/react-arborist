import React, { CSSProperties } from "react";
import { CursorProps } from "../types/renderers";

const placeholderStyle = {
  display: "flex",
  alignItems: "center",
  zIndex: 1,
};

const lineStyle = {
  flex: 1,
  height: "2px",
  background: "#4B91E2",
  borderRadius: "1px",
};

const circleStyle = {
  width: "4px",
  height: "4px",
  boxShadow: "0 0 0 3px #4B91E2",
  borderRadius: "50%",
};

export const DefaultCursor = React.memo(function DefaultCursor({ top, left, indent }: CursorProps) {
  const style: CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    top: top - 2 + "px",
    left: left + "px",
    right: indent + "px",
  };
  return (
    <div style={{ ...placeholderStyle, ...style }}>
      <div style={{ ...circleStyle }}></div>
      <div style={{ ...lineStyle }}></div>
    </div>
  );
});
