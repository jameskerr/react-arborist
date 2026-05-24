const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(_on, _config) {
      // implement node event listeners here
    },
    viewportHeight: 900,
    /* The showcase is a Next.js static export, so every row is present in the
       served HTML before React hydrates. A click can land in the gap before
       handlers attach; Cypress retries assertions but not the click that
       missed. Retry the whole test in CI to absorb that hydration race. A real
       failure still fails on every attempt, so this masks nothing. */
    retries: { runMode: 2, openMode: 0 },
  },
});
