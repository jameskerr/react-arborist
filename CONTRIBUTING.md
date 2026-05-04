# Testing Locally

1. Clone the repo
2. From the root, run `yarn && yarn start`
3. Visit <http://localhost:3000>

# Running Tests

Run `yarn build && yarn test` from the root of the repo.

To test individual modules, cd into them and run `yarn test`. For example, running the unit tests would be `cd modules/react-arborist && yarn test`.

# Publishing a Release

### Release Branch

1. Checkout main locally
2. Increment the version number in modules/react-arborist/package.json
3. Create a branch called release/v0.0.0
4. Open a PR to main
5. Test, review, and merge, delete branch

### Create Github Release

1. Create a release based on main
2. Assign a new tag to be created with v0.0.0
3. Title the release "Version 0.0.0"
4. Write release notes
5. Publish
6. Check that it successfully published to npmjs

The Github actions workflow will publish to npm.

# Publish the Demo Site

I run yarn build, then I copy the showcase/out directory into the netlify manual deploys interface.
