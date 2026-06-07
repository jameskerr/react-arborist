#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = path.join(rootDir, "modules/react-arborist/package.json");
const changelogPath = path.join(rootDir, "CHANGELOG.md");
const changesDir = path.join(rootDir, ".changes");

/* type → { changelog heading, bump rank }. Headings match the existing
   CHANGELOG.md sections; rank picks the largest bump across all changesets. */
const TYPES = {
  breaking: { heading: "**Breaking Changes**", rank: 3 },
  feature: { heading: "**Features**", rank: 2 },
  fix: { heading: "**Fixes**", rank: 1 },
};
const RANK_TO_BUMP = { 3: "major", 2: "minor", 1: "patch" };

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

/* Read every .changes/*.md (except README.md) and parse its frontmatter. Each
   file is a `--- key: value --- body` document; no YAML dep needed. */
function readChangesets() {
  let files;
  try {
    files = readdirSync(changesDir);
  } catch {
    return [];
  }
  return files
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => {
      const raw = readFileSync(path.join(changesDir, f), "utf8");
      const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
      if (!m) fail(`Malformed changeset ${f}: expected frontmatter between --- fences.`);
      const meta = {};
      for (const line of m[1].split("\n")) {
        const kv = line.match(/^\s*([A-Za-z]+)\s*:\s*(.+?)\s*$/);
        if (kv) meta[kv[1]] = kv[2];
      }
      if (!TYPES[meta.type]) {
        fail(
          `Changeset ${f}: type must be one of ${Object.keys(TYPES).join(", ")} (got "${meta.type}").`,
        );
      }
      if (!meta.pr) fail(`Changeset ${f}: missing "pr".`);
      const body = m[2].trim();
      if (!body) fail(`Changeset ${f}: body is empty.`);
      return { type: meta.type, pr: meta.pr, credit: meta.credit, body, file: f };
    });
}

/* Build the `# Version X.Y.Z` block plus the body alone (for the GH release). */
function renderSection(version, changesets) {
  const parts = [];
  for (const type of Object.keys(TYPES)) {
    const entries = changesets.filter((c) => c.type === type);
    if (entries.length === 0) continue;
    const bullets = entries
      .map((c) => `- ${c.body} (#${c.pr}${c.credit ? `, originally #${c.credit}` : ""})`)
      .join("\n");
    parts.push(`${TYPES[type].heading}\n\n${bullets}`);
  }
  const body = parts.join("\n\n");
  return { body, block: `# Version ${version}\n\n${body}\n` };
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
    fail(
      `Local ${branch} (${local.slice(0, 7)}) differs from ${remoteName}/${branch} (${remote.slice(0, 7)}).`,
    );
  }
  console.log("  in sync");
}

if (!flags.skipTests) {
  step("Running tests");
  run("yarn workspace react-arborist test");
}

step("Building library");
run("yarn build-lib");

const changesets = readChangesets();
if (changesets.length === 0) {
  fail("No changesets in .changes/. Add a `.changes/*.md` entry before releasing.");
}

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const oldVersion = pkg.version;
// Derive the bump from the changeset types; an explicit arg overrides it.
const maxRank = Math.max(...changesets.map((c) => TYPES[c.type].rank));
const kind = versionArg ?? RANK_TO_BUMP[maxRank];
const newVersion = bump(oldVersion, kind);
const tag = `v${newVersion}`;

console.log(
  `\nVersion: ${oldVersion} → ${newVersion}  (tag: ${tag}, ${versionArg ? "explicit" : "inferred"} ${kind})`,
);

if (out(`git tag -l ${tag}`)) {
  fail(`Tag ${tag} already exists.`);
}

const { body: releaseNotes, block: changelogBlock } = renderSection(newVersion, changesets);
console.log(
  `\nRelease notes (assembled from ${changesets.length} changeset(s)):\n${releaseNotes}\n`,
);

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

step(`Prepending "# Version ${newVersion}" to CHANGELOG.md`);
if (flags.preview) {
  console.log(`  [preview] prepend assembled section`);
} else {
  writeFileSync(changelogPath, `${changelogBlock}\n${readFileSync(changelogPath, "utf8")}`);
}

step(`Consuming ${changesets.length} changeset(s)`);
for (const c of changesets) {
  run(`git rm --quiet ${path.join(".changes", c.file)}`);
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
