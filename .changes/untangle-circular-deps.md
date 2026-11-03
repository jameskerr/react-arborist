---
type: fix
---

Untangle the circular import between `data/create-root` and `interfaces/node-api`, and initialise each slice's state per store rather than from a shared module-level object. No change to the public API or to rendered output.
