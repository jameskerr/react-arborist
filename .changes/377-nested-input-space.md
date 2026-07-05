---
type: fix
pr: 377
---
Inputs rendered inside the tree (e.g. an `<input>` in a modal) can now receive
Space characters again. The tree's keyboard handler no longer intercepts
keystrokes that originate from a nested form field or contenteditable element.
