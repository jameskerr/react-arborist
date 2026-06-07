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
- `CHANGELOG.md` — release notes. The release script reads the `# Version X.Y.Z` section from here and refuses to release if it's missing.

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
2. Add a `# Version X.Y.Z` section at the top of `CHANGELOG.md` for the upcoming version, with `**Features**` / `**Fixes**` subsections. Each bullet should end with the PR number in parens, e.g. `(#342)`. Commit and push. (Often this entry lands as part of the feature PR itself — check `CHANGELOG.md` before adding a new commit.)
3. Run `yarn release <patch|minor|major|X.Y.Z>`. The script:
   - Verifies branch is `main`, working tree is clean, local matches remote.
   - Runs `yarn workspace react-arborist test` and `yarn build-lib`.
   - Reads the matching `# Version X.Y.Z` section from `CHANGELOG.md` — **fails if missing**.
   - Bumps `modules/react-arborist/package.json`, commits as `vX.Y.Z`, tags `vX.Y.Z`.
   - Pushes the commit and tag to the tracking remote.
   - Creates a GitHub Release using the changelog section as the body.
4. `gh run watch` to watch the publish workflow. Confirm the new version on <https://www.npmjs.com/package/react-arborist>.

### Flags

- `--preview` — dry-run. Reads git state and builds, but does not commit, tag, push, or release.
- `--any-branch` — skip the `main` check and the remote sync check.
- `--no-tests` — skip the unit test step.
- `--yes` / `-y` — skip the interactive confirmation.

### Agent guidance

Agents should **not** run `yarn release` themselves — it pushes tags, mutates npm, and creates a public GitHub Release. The maintainer cuts releases. An agent's job around a release is typically:

- Add or refine the `# Version X.Y.Z` entry in `CHANGELOG.md`.
- Confirm `main` has all the PRs that should be in the release.
- Optionally run `yarn release <kind> --preview` to verify the script's preconditions pass.

## Conventions

- Commit messages: short imperative subject; no required prefix. Look at recent `git log` for tone.
- PRs: when a PR closes or supersedes older PRs (this repo has accumulated a long tail), credit the original author in the changelog with `originally #NNN`.
- Don't add comments that just restate the code. Don't add backwards-compat shims for code that hasn't shipped yet.
