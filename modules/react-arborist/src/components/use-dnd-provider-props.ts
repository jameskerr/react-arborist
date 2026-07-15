import { useEffect, useMemo, useState } from "react";
import type { DndProviderProps as ReactDndProviderProps } from "react-dnd";
import { TreeProps } from "../types/tree-props";
import { isErrorWithCode } from "../utils";

const NOT_INSTALLED_MESSAGE =
  "[react-arborist] react-dnd-html5-backend is not installed. " +
  "Either install it (`npm install react-dnd-html5-backend`) or pass a " +
  "custom backend via the `dndBackend` prop, or share an existing " +
  "DragDropManager via the `dndManager` prop.";

/* Derived from react-dnd (a required peer dep) instead of imported from
   react-dnd-html5-backend (an optional peer dep) — otherwise this type-only
   import would land in the published .d.ts and force every TypeScript
   consumer to install html5-backend, even ones that only ever pass their own
   dndBackend/dndManager. */
type Backend = Extract<ReactDndProviderProps<unknown, unknown>, { backend: unknown }>["backend"];

/* react-dnd-html5-backend is an optional peer dependency — only required when
   neither dndBackend nor dndManager is provided.
   ESM is the default loading path: it works everywhere (Node, bundlers, and
   pure-ESM runtimes) via dynamic import(). require() is used only as a
   synchronous fast path when it's available, so the common Node/bundler/Jest
   case gets the backend with no async delay. Passing `dndBackend` or
   `dndManager` explicitly opts out of this auto-detection entirely. */
function requireHTML5BackendSync(): Backend | null {
  if (typeof require === "undefined") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-dnd-html5-backend").HTML5Backend;
  } catch (err) {
    // ESM-only builds and missing require() both fall back to dynamic import().
    if (isErrorWithCode(err, "ERR_REQUIRE_ESM")) return null;
    if (isErrorWithCode(err, "MODULE_NOT_FOUND")) throw new Error(NOT_INSTALLED_MESSAGE);
    throw err;
  }
}

export type DndProviderProps =
  | { manager: NonNullable<TreeProps<unknown>["dndManager"]> }
  | { backend: Backend; options: { rootElement: Node | undefined } };

/**
 * Resolves the props to spread onto react-dnd's <DndProvider>. Returns null
 * while the default HTML5 backend is still loading via the dynamic import()
 * fallback (pure-ESM/no-require() context) — callers should render nothing
 * for that one tick.
 */
export function useDndProviderProps<T>(
  treeProps: TreeProps<T>,
  dndRootElement: Node | undefined,
): DndProviderProps | null {
  const needsDefaultBackend = !treeProps.dndManager && !treeProps.dndBackend;
  // Resolved once via useMemo rather than called directly in the render body —
  // require() is an impure side effect that would otherwise re-run on every
  // render (twice under StrictMode/concurrent rendering).
  const syncBackend = useMemo(
    () => (needsDefaultBackend ? requireHTML5BackendSync() : null),
    [needsDefaultBackend],
  );
  const [asyncBackend, setAsyncBackend] = useState<{ backend: Backend } | { error: Error } | null>(
    null,
  );

  useEffect(() => {
    if (!needsDefaultBackend || syncBackend) return;
    let cancelled = false;
    import("react-dnd-html5-backend").then(
      (mod) => {
        if (!cancelled) setAsyncBackend({ backend: mod.HTML5Backend });
      },
      (err) => {
        if (cancelled) return;
        // Not-installed is expected (optional dependency) — surface the actionable
        // message. Anything else is unexpected and shouldn't be masked as "not installed".
        if (isErrorWithCode(err, "MODULE_NOT_FOUND") || isErrorWithCode(err, "ERR_MODULE_NOT_FOUND")) {
          setAsyncBackend({ error: new Error(NOT_INSTALLED_MESSAGE) });
        } else {
          setAsyncBackend({ error: err instanceof Error ? err : new Error(String(err)) });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [needsDefaultBackend, syncBackend]);

  if (treeProps.dndManager) return { manager: treeProps.dndManager };

  if (treeProps.dndBackend) {
    return { backend: treeProps.dndBackend, options: { rootElement: dndRootElement } };
  }

  // Only surface an async-load failure once we know the default backend is
  // actually still needed — if the caller since switched to dndBackend/
  // dndManager (handled above), a stale load error must not block rendering.
  if (asyncBackend && "error" in asyncBackend) throw asyncBackend.error;

  const html5Backend = syncBackend ?? (asyncBackend && asyncBackend.backend);
  if (!html5Backend) return null;
  return { backend: html5Backend, options: { rootElement: dndRootElement } };
}
