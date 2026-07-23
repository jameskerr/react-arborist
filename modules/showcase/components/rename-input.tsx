import { NodeApi } from "react-arborist";

/** Inline rename input for a tree row: autofocuses, selects existing text,
 * submits on Enter, and reverts on Escape/blur. Shared by every showcase demo
 * that supports renaming (cities, gmail). */
export function RenameInput<T extends { name: string }>({ node }: { node: NodeApi<T> }) {
  return (
    <input
      autoFocus
      name="name"
      type="text"
      defaultValue={node.data.name}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => node.reset()}
      onKeyDown={(e) => {
        if (e.key === "Escape") node.reset();
        if (e.key === "Enter") node.submit(e.currentTarget.value);
      }}
    />
  );
}
