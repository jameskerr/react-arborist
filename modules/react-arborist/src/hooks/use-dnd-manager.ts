import { DragDropManager, createDragDropManager } from "dnd-core";
import { HTML5Backend } from "react-dnd-html5-backend";

// Module-level singleton to ensure only one DnD manager exists across the entire application
let globalDndManager: DragDropManager | null = null;

/**
 * Hook to get the singleton DnD manager that is shared across all Tree instances.
 * This prevents the "Cannot have two HTML5 backends at the same time" error when multiple
 * trees are rendered in the same React application.
 * 
 * The manager is created once at the module level and reused for all subsequent calls.
 * 
 * @example
 * ```tsx
 * function App() {
 *   const dndManager = useDndManager();
 *   
 *   return (
 *     <>
 *       <Tree dndManager={dndManager} ... />
 *       <Tree dndManager={dndManager} ... />
 *     </>
 *   );
 * }
 * ```
 */
export function useDndManager(): DragDropManager {
  if (!globalDndManager) {
    // Lazy initialize the manager only once at module level
    globalDndManager = createDragDropManager(HTML5Backend);
  }
  
  return globalDndManager;
}
