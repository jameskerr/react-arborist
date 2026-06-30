---
type: breaking
pr: 371
---
`react-dnd` and `react-dnd-html5-backend` are now **peer dependencies** instead of
bundled dependencies. Install them alongside react-arborist:

```bash
npm install react-arborist react-dnd react-dnd-html5-backend
```

This fixes a global singleton conflict (#319) where apps that also used react-dnd
ended up with two independent copies of the library, causing drag-and-drop to silently
break or throw "Cannot have two HTML5 backends at the same time."

`react-dnd-html5-backend` is optional when a custom `dndBackend` or `dndManager` prop
is provided. Requires react-dnd **v16** (`^16`) and Node.js **≥ 22**.
