#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = path.join(rootDir, "modules/react-arborist/package.json");
const changelogPath = path.join(rootDir, "CHANGELOG.md");

const args = process.argv.slice(2);
const flags = {
  preview: args.includes("--preview"),
  anyBranch: args.includes("--any-branch"),
  skipTests: args.includes("--no-tests"),
  yes: args.includes("--yes") || args.includes("-y"),
};
const versionArg = args.find((a) => !a.startsWith("-"));

function out(cmd) {
  return execSync(cmd, { cwd: rootDir, encoding: "utf8" }).trim();
}

function run(cmd) {
  if (flags.preview) {
    console.log(`  [preview] ${cmd}`);
    return;
  }
  execSync(cmd, { cwd: rootDir, stdio: "inherit" });
}

function step(name) {
  console.log(`\n→ ${name}`);
}

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

function bump(current, kind) {
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
  const [maj, min, pat] = current.split(".").map(Number);
  if (kind === "patch") return `${maj}.${min}.${pat + 1}`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  if (kind === "major") return `${maj + 1}.0.0`;
  fail(`Invalid version: "${kind}". Use patch, minor, major, or X.Y.Z.`);
}

function readChangelogSection(version) {
  const content = readFileSync(changelogPath, "utf8");
  const escaped = version.replace(/\./g, "\\.");
  const re = new RegExp(`^# Version ${escaped}\\s*\\n([\\s\\S]*?)(?=^# Version |\\Z)`, "m");
  const match = content.match(re);
  return match ? match[1].trim() : null;
}

if (!versionArg) {
  fail("Usage: yarn release <patch|minor|major|X.Y.Z> [--preview] [--any-branch] [--no-tests] [--yes]");
}

step("Checking branch");
const branch = out("git rev-parse --abbrev-ref HEAD");
if (branch !== "main" && !flags.anyBranch) {
  fail(`Not on main (currently on ${branch}). Use --any-branch to override.`);
}
console.log(`  on ${branch}`);

step("Checking working tree");
if (out("git status --porcelain")) {
  fail("Working tree not clean. Commit or stash first.");
}
console.log("  clean");

let remoteName = "origin";
if (flags.anyBranch) {
  console.log("\n→ Skipping remote sync check (--any-branch)");
} else {
  try {
    remoteName = out(`git config --get branch.${branch}.remote`);
  } catch {
    fail(`Branch ${branch} has no upstream tracking remote configured.`);
  }
  step(`Fetching ${remoteName}`);
  execSync(`git fetch ${remoteName}`, { cwd: rootDir, stdio: "inherit" });
  const local = out(`git rev-parse ${branch}`);
  const remote = out(`git rev-parse ${remoteName}/${branch}`);
  if (local !== remote) {
    fail(`Local ${branch} (${local.slice(0, 7)}) differs from ${remoteName}/${branch} (${remote.slice(0, 7)}).`);
  }
  console.log("  in sync");
}

if (!flags.skipTests) {
  step("Running tests");
  run("yarn workspace react-arborist test");
}

step("Building library");
run("yarn build-lib");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const oldVersion = pkg.version;
const newVersion = bump(oldVersion, versionArg);
const tag = `v${newVersion}`;

console.log(`\nVersion: ${oldVersion} → ${newVersion}  (tag: ${tag})`);

if (out(`git tag -l ${tag}`)) {
  fail(`Tag ${tag} already exists.`);
}

const releaseNotes = readChangelogSection(newVersion);
if (!releaseNotes) {
  fail(`No "# Version ${newVersion}" section found in CHANGELOG.md. Add one before releasing.`);
}
console.log(`\nRelease notes (from CHANGELOG.md):\n${releaseNotes}\n`);

if (!flags.preview && !flags.yes) {
  const rl = createInterface({ input, output });
  const answer = await rl.question(`Continue? (y/N) `);
  rl.close();
  if (answer.trim().toLowerCase() !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }
}

step(`Bumping ${pkgPath} to ${newVersion}`);
if (flags.preview) {
  console.log(`  [preview] write version=${newVersion}`);
} else {
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

step("Committing");
run(`git commit -am ${tag}`);

step(`Tagging ${tag}`);
run(`git tag -a ${tag} -m ${tag}`);

step(`Pushing commit + tag to ${remoteName}`);
run(`git push ${remoteName} ${branch} ${tag}`);

step("Creating GitHub release");
const remoteUrl = out(`git config --get remote.${remoteName}.url`);
const repoMatch = remoteUrl.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/);
if (!repoMatch) fail(`Could not parse owner/repo from remote URL: ${remoteUrl}`);
const repo = `${repoMatch[1]}/${repoMatch[2]}`;
const notesPath = path.join(os.tmpdir(), `release-notes-${tag}.md`);
if (flags.preview) {
  console.log(`  [preview] write notes to ${notesPath}`);
} else {
  writeFileSync(notesPath, releaseNotes + "\n");
}
run(`gh release create ${tag} --repo ${repo} --title ${tag} --notes-file ${notesPath}`);

console.log(`\nReleased ${tag}. Watch the publish workflow with: gh run watch`);
