import React from "react";
import { useTreeApi } from "../context.js";
import { DefaultContainer } from "./default-container.js";

export function TreeContainer() {
  const tree = useTreeApi();
  const Container = tree.props.renderContainer || DefaultContainer;
  return (
    <>
      <Container />
    </>
  );
}
