# AGENTS.md

Orientation for AI coding agents working in this repo.

## What this is

`react-arborist` is a React tree-view component: virtualized, drag-and-drop reorderable, multi-selectable, filterable. Published to npm as [`react-arborist`](https://www.npmjs.com/package/react-arborist). Canonical repo: <https://github.com/jameskerr/react-arborist>.

The library wraps `react-window` for virtualization, `react-dnd` (HTML5 backend by default) for DnD, and a small `redux` store for internal state.

## Repo layout

Yarn 4 workspaces monorepo. Top-level scripts in the root `package.json` delegate into modules.

- `modules/react-arborist/` — the published library. Source in `src/`, built to `dist/main` (CJS) and `dist/module` (ESM) via `tsc`. Unit tests are Jest.
- `modules/showcase/` — Next.js demo site used for manual testing and the public demo. Depends on `react-arborist` as `workspace:*`, but Next bundles its **built `dist/`**, not its `src/` — see the caveat below.
- `modules/e2e/` — Cypress end-to-end tests that drive the showcase's static export. `yarn workspace e2e test` boots `serve` against `modules/showcase/out` and runs all specs.
- `modules/docs/` — the documentation site (Hugo + Tailwind).

Other notable files:

- `bin/release.mjs` — release orchestration script, driven by `yarn release`. Bumps the version and pushes a tag; the tag push is what kicks off publishing.
- `bin/publish` — the actual npm publish step. Builds the library, copies `README.md` into the library workspace, then `npm publish`es from there. Invoked from CI by `.github/workflows/publish.yml` on tag push; also runnable by hand.
- `CHANGELOG.md` — assembled release notes, one `# Version X.Y.Z` section per release. `bin/release.mjs` generates each section from the pending `.changes/` entries at release time. To record a change you add a `.changes/` entry, not a `CHANGELOG.md` edit (see "Adding a changeset" below).
- `.changes/` — one Markdown file per user-facing change (the "changeset"). Each PR adds its own file, so entries never conflict and PRs merge in any order. `bin/release.mjs` consumes them at release time. The format is in `.changes/README.md`; the field-level gotchas are under "Adding a changeset" below.

## Tooling

- Node: pinned by `.node-version` at the repo root (currently `24.12.0`); use `fnm` (or any tool that reads `.node-version`) to match locally. Note that CI's publish workflow runs on Node `20.x` — kept separate because the published package needs to load on older Node.
- Package manager: Yarn 4.0.2 (`packageManager` field in root `package.json`).
- Lint: `oxlint` (`yarn lint`, `yarn lint:fix`).
- Format: `oxfmt` (`yarn fmt`, `yarn fmt:check`).
- Unit tests: Jest, scoped to the library workspace (`yarn workspace react-arborist test`).
- E2E: Cypress (`yarn workspace e2e test`).

## Build caveat (read this before debugging showcase changes)

The showcase imports `react-arborist` from `dist/`, not `src/`. If you change library source and rebuild only the showcase, the change does **not** propagate — Next is still bundling the old `dist/`. Sequence:

```sh
yarn workspace react-arborist build   # rebuild library dist
yarn workspace showcase build         # then rebuild showcase
```

Or run `yarn start` from the root, which clean-builds the library then runs the library in watch + the showcase dev server in parallel.

The same caveat applies to e2e tests: Cypress drives the showcase's static export, so library changes need a library rebuild first.

## Testing

Unit tests live alongside the source in `modules/react-arborist/src/**/*.test.ts(x)` and run on Jest + Testing Library (`yarn workspace react-arborist test`, or `yarn test` from inside the library workspace).

A passing run is not enough — **read the console output and treat warnings as failures to fix, not noise to scroll past.** Jest reports passing tests even when React or the libraries log to `console.error`/`console.warn`, so it's easy to let warnings accumulate. The common offender here is React's "An update to X inside a test was not wrapped in act(...)": some tree interactions (selection, focus) kick off an async `scrollTo`, whose state update resolves on a microtask after the synchronous `act()` scope from `fireEvent`/`render` has already closed. Wrap the interaction (or a trailing flush) in `await act(async () => { … })` so that update lands inside an `act` scope. When you add or change a test, run the whole suite and confirm it is **warning-clean** before pushing.

## Release process

Releases are driven by `bin/release.mjs` (`yarn release`). The script does git checks, runs tests, builds, bumps `modules/react-arborist/package.json`, commits, tags, pushes, and creates a GitHub Release. The tag push triggers `.github/workflows/publish.yml`, which `npm publish`es via OIDC Trusted Publishing — no npm token is involved.

### Steps

1. On `main`, working tree clean, in sync with the remote.
2. Confirm the pending changes have `.changes/` entries (they normally land with their PRs). You do **not** hand-edit `CHANGELOG.md` — the script writes it.
3. Run `yarn release` (no version argument needed — the bump is inferred). The script:
   - Verifies branch is `main`, working tree is clean, local matches remote.
   - Runs `yarn workspace react-arborist test` and `yarn build-lib`.
   - Reads `.changes/*.md` — **fails if there are none**. Infers the bump from the entry types (`breaking` → major, `feature` → minor, `fix` → patch; takes the largest). Pass an explicit `patch|minor|major|X.Y.Z` only to override.
   - Assembles a new `# Version X.Y.Z` section and prepends it to `CHANGELOG.md`, then `git rm`s the consumed `.changes/` files.
   - Bumps `modules/react-arborist/package.json`, commits as `vX.Y.Z` (changelog + deletions + version in one commit), tags `vX.Y.Z`.
   - Pushes the commit and tag to the tracking remote.
   - Creates a GitHub Release using the assembled section as the body.
4. `gh run watch` to watch the publish workflow. Confirm the new version on <https://www.npmjs.com/package/react-arborist>.

### Flags

- `--preview` — dry-run. Reads git state and builds, but does not commit, tag, push, or release.
- `--any-branch` — skip the `main` check and the remote sync check.
- `--no-tests` — skip the unit test step.
- `--yes` / `-y` — skip the interactive confirmation.

### Agent guidance

Agents should **not** run `yarn release` themselves — it pushes tags, mutates npm, and creates a public GitHub Release. The maintainer cuts releases. An agent's job around a change is typically:

- Add a `.changes/` entry for the change (details below) — **not** edit `CHANGELOG.md` directly. A PR that touches `modules/react-arborist/src/` without one fails the `Changeset` CI check; apply the `skip-changelog` label for changes with no user-facing effect (refactors, tests, CI, docs).
- Confirm `main` has all the PRs (and their changesets) that should be in the release.
- Optionally run `yarn release --preview` (add `--any-branch --no-tests` off `main`) to verify the inferred bump and the assembled notes look right.

#### Adding a changeset

Create `.changes/<short-slug>.md` (slug is free-form; name it after the change, e.g. `313-drop-bottom-of-list.md`). `.changes/README.md` has the full format; the parts that trip agents up:

- **`type`** (required): one of `breaking`, `feature`, `fix`. This both files the entry under the matching `CHANGELOG.md` heading and sets the release bump (`breaking` → major, `feature` → minor, `fix` → patch; the release takes the largest across all pending entries).
- **`pr`** (required): *this PR's own* number, rendered as the trailing `(#NNN)`. You can't know it until the PR exists, so the order is: write the changeset with your best-guess number, open the PR, then read the real number from `gh pr view` and correct the field in a follow-up commit if the guess was wrong. Never leave an unverified number.
- **`credit`** (optional): the number of an *earlier PR this one supersedes*, rendered as `(#NNN, originally #MMM)`. The repo has a long tail of stale PRs; use `credit` to attribute the original author when you carry someone else's PR across the line. **It is not for the issue you're fixing** — an issue number here renders as if it were a superseded PR, which is wrong. Reference the fixed issue in the body text instead.
- **Body** (everything after the closing `---`): the changelog bullet text. Mention the issue being fixed here (e.g. "... again (issue #313).").

To sanity-check an entry before it ships, **commit it first**, then run `yarn release --preview --any-branch --no-tests` and read the assembled section it prints. The preview runs a working-tree-clean check before it parses `.changes/`, so it fails on a dirty tree even with `--any-branch` — an uncommitted changeset won't preview.

## Conventions

- Commit messages: short imperative subject; no required prefix. Look at recent `git log` for tone.
- PRs: when a change supersedes an older PR (this repo has a long tail), attribute the original author via the changeset's `credit` field — see "Adding a changeset". `credit` is for a prior PR, never the issue being fixed.
- Don't add comments that just restate the code. Don't add backwards-compat shims for code that hasn't shipped yet.
