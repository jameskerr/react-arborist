# Changesets

Each user-facing change gets a small Markdown file in this directory describing
it. At release time, `bin/release.mjs` (`yarn release`) collects every entry,
infers the version bump, assembles the new `# Version X.Y.Z` section at the top
of [`CHANGELOG.md`](../CHANGELOG.md), and deletes the files it consumed.

Because each PR adds its own file, changelog entries never conflict and PRs can
merge in any order — no one has to pick the next version number up front.

## Adding an entry

Create `.changes/<short-slug>.md` (the slug is yours to choose; e.g.
`303-ctrl-multiselect.md`):

```markdown
---
type: fix
---
Mouse multi-selection now responds to Ctrl+Click and Ctrl+A on Windows/Linux,
in addition to the existing Cmd (Meta) shortcuts on macOS.
```

### Frontmatter

| Field    | Required | Meaning                                                                 |
| -------- | -------- | ----------------------------------------------------------------------- |
| `type`   | yes      | `breaking`, `feature`, or `fix`. Picks the changelog subsection.        |
| `pr`     | no       | Override the trailing `(#NNN)`. Normally omitted — see below.           |
| `credit` | no       | An earlier PR this supersedes. Rendered as `(#NNN, originally #MMM)`.   |

The body (everything after the closing `---`) is the changelog bullet text and
may span multiple lines.

### The PR number is derived, not written

You don't set `pr`. A PR's number isn't known until the PR exists, but the
changeset ships inside that PR — so at release time `bin/release.mjs` finds the
commit that added each changeset file and asks GitHub which PR it belongs to,
rendering that as the trailing `(#NNN)`. Set `pr:` only to override this (e.g.
a changeset committed straight to `main`, which has no PR to find). Mention the
_issue_ being fixed in the body text, not here.

### How `type` maps to the release

- `breaking` → **major** bump, under `**Breaking Changes**`
- `feature` → **minor** bump, under `**Features**`
- `fix` → **patch** bump, under `**Fixes**`

The release takes the largest bump across all pending changesets. `yarn release`
needs no version argument, but you can still pass `patch|minor|major|X.Y.Z` to
override the inferred bump.

## When an entry isn't needed

Refactors, test-only, CI, or docs changes that don't touch published behavior
don't need a changeset. Apply the `skip-changelog` label to the PR and CI's
changeset check will pass.

`README.md` (this file) is ignored by the release script.
