#!/usr/bin/env node
/*
 * tsc (--module esnext --moduleResolution bundler) emits extensionless
 * relative specifiers (e.g. `from "./components/tree"`). That's fine for
 * bundlers, but Node's native ESM resolver — and TypeScript `nodenext`
 * consumers reading dist/module *.d.ts — require an explicit extension.
 * This rewrites emitted dist/module **\/*.{js,d.ts} in place, and marks the
 * directory as ESM, so the build that ships under the `exports.import`
 * condition resolves under plain `node` / `nodenext`.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const distModule = resolve(process.argv[2]);

const SPECIFIER_RE = /((?:from|import)\s*\(?\s*["'])(\.\.?\/[^"']+)(["'])/g;

function resolveSpecifier(fileDir, specifier) {
  const target = resolve(fileDir, specifier);
  if (existsSync(`${target}.js`) || existsSync(`${target}.d.ts`)) {
    return `${specifier}.js`;
  }
  if (existsSync(join(target, "index.js")) || existsSync(join(target, "index.d.ts"))) {
    return `${specifier}/index.js`;
  }
  throw new Error(`Could not resolve relative specifier "${specifier}" from ${fileDir}`);
}

function fixFile(filePath) {
  const original = readFileSync(filePath, "utf8");
  const fileDir = dirname(filePath);
  let changed = false;

  const fixed = original.replace(SPECIFIER_RE, (match, prefix, specifier, suffix) => {
    if (/\.[cm]?js$|\.json$/.test(specifier)) return match;
    changed = true;
    return `${prefix}${resolveSpecifier(fileDir, specifier)}${suffix}`;
  });

  if (changed) writeFileSync(filePath, fixed);
}

for (const entry of readdirSync(distModule, { recursive: true })) {
  if (entry.endsWith(".js") || entry.endsWith(".d.ts")) {
    fixFile(join(distModule, entry));
  }
}

writeFileSync(join(distModule, "package.json"), JSON.stringify({ type: "module" }, null, 2) + "\n");
