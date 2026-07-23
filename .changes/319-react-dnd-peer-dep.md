---
type: breaking
---
`react-dnd` and `react-dnd-html5-backend` are now **peer dependencies** instead of
bundled dependencies. Install them alongside react-arborist:

```bash
npm install react-arborist react-dnd react-dnd-html5-backend
```

This fixes a global singleton conflict (#319) where apps that also used react-dnd
ended up with two independent copies of the library, causing drag-and-drop to silently
break or throw "Cannot have two HTML5 backends at the same time."

Requires react-dnd **v16** (`^16`), `react-dnd-html5-backend` **v16** (`^16`), and
Node.js **≥ 22**. Both peers are required (html5-backend is tree-shaken when you
pass your own `dndBackend` / `dndManager`).
