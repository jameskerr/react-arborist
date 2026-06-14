---
type: fix
pr: 366
---
`TreeApi` methods (`select`, `focus`, `delete`, `edit`, node creation, etc.) now
honor a custom `idAccessor` when given raw row data, instead of always reading
`.id`. The identifier parameters and the `onCreate` return type accept your data
type, so a custom accessor works end-to-end.
