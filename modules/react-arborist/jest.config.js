/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  coverageProvider: "v8",

  // ts-jest with isolatedModules for fast transpilation.
  // react-dnd@16, react-dnd-html5-backend@16, dnd-core@16, and @react-dnd/* ship
  // ESM-only. Jest's CJS runtime can't load them directly, so they're transpiled
  // via ts-jest. (Node 22+ supports require(esm) natively, but Jest uses its own
  // module system independent of Node's native loader.)
  preset: "ts-jest",
  transform: {
    "^.+\\.[jt]sx?$": [
      "ts-jest",
      { isolatedModules: true, tsconfig: { allowJs: true } },
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(react-dnd|react-dnd-html5-backend|dnd-core|@react-dnd)/)",
  ],

  rootDir: "./src",
  testEnvironment: "jsdom",

  // "node" preserves Jest's standard Node.js resolution as the baseline;
  // "require" selects CJS builds for packages with dual exports maps.
  testEnvironmentOptions: {
    customExportConditions: ["node", "require", "default"],
  },
};

module.exports = config;
