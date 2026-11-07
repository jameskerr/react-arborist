/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  coverageProvider: "v8",

  // `module`/`moduleResolution` override the tsconfig's nodenext, which would
  // emit ESM here (this package is `"type": "module"`) — Jest runs CommonJS.
  //
  // `isolatedModules` is required, not just faster: ts-jest's type-checking path
  // builds a TS program and won't emit for out-of-program node_modules
  // files. Test files are still type-checked — tsc covers them during `yarn build`.
  preset: "ts-jest",
  transform: {
    "^.+\\.[jt]sx?$": [
      "ts-jest",
      {
        tsconfig: {
          allowJs: true,
          isolatedModules: true,
          module: "commonjs",
          moduleResolution: "node10",
        },
      },
    ],
  },

  // Source imports name the emitted `.js` file (`./tree.js`); point Jest at
  // the `.ts`/`.tsx` beside it.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  rootDir: "./src",
  testEnvironment: "jsdom",

  // Kept aligned with the README's copy-pasteable recipe, and as a guard for
  // whatever dependency shows up next with a "node"/"browser"-conditional
  // `exports` map. "require" picks CJS builds. "browser" is restated because
  // this list *replaces* jsdom's default rather than extending it. Do not add
  // "node": package `exports` maps match in the package's own key order, so a
  // future dependency that lists "node" before "browser" would resolve its
  // Node build under jsdom.
  testEnvironmentOptions: {
    customExportConditions: ["browser", "require", "default"],
  },
};

module.exports = config;
