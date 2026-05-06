# Testing Locally

1. Clone the repo
2. From the root, run `yarn && yarn start`
3. Visit <http://localhost:3000>

# Running Tests

Run `yarn build && yarn test` from the root of the repo.

To test individual modules, cd into them and run `yarn test`. For example, running the unit tests would be `cd modules/react-arborist && yarn test`.

# Publishing a Release

Releases are driven by `bin/release.mjs`, invoked via `yarn release`. The script bumps the version, runs tests, and pushes a `v*` tag. The tag push triggers `.github/workflows/publish.yml`, which publishes to npm via Trusted Publishing (OIDC) — no token needed.

1. On `main`, with a clean working tree, update `CHANGELOG.md` with a new section for the upcoming version. Commit and push.
2. Run `yarn release <patch|minor|major|X.Y.Z>` from the repo root. The script will:
   - Verify you're on `main`, the working tree is clean, and you're in sync with the remote
   - Run tests and build
   - Bump `modules/react-arborist/package.json`, commit it, and tag `vX.Y.Z`
   - Push the commit and tag to `origin`
   - Open a GitHub Release draft in your browser (via `gh`)
3. Edit the release draft, paste in the changelog entry, and publish.
4. Watch `gh run watch` — the publish workflow will build and `npm publish` via OIDC. Confirm the new version on https://www.npmjs.com/package/react-arborist.

Flags:

- `--preview` — dry-run; the script still reads git state and builds, but no commit, tag, push, or release draft is created.
- `--any-branch` — skip both the `main` branch check and the remote sync check (useful for testing on a branch that isn't pushed).
- `--no-tests` — skip `yarn test`.
- `--yes` — skip the interactive confirmation.

# Publish the Demo Site

I run yarn build, then I copy the showcase/out directory into the netlify manual deploys interface.
