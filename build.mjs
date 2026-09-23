// Build the publishable did:avtr spec site from the repo sources.
//
// Source of truth:
//   index.md            — the current method spec (version parsed from its header)
//   versions/*.md       — frozen snapshots of past versions (optional; created on version bump)
//
// Output (site/) is deployed to GitHub Pages by .github/workflows/publish.yml.
// All internal links are RELATIVE so the tree works under any base path — the
// interim GitHub Pages base (…/Avatar-DID-Specification/) and the canonical
// avatar.me home alike:
//   specs/did-method-avtr/v<X.Y>/        — versioned spec (HTML + source .md)
//   specs/did-method-avtr/latest/        — alias carrying the current version's content
//   index.html                           — landing page

import { mkdir, readFile, writeFile, cp, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const SITE = path.join(ROOT, "site");
const SPEC_PATH = "specs/did-method-avtr";

marked.setOptions({ gfm: true, headerIds: true, mangle: false });

function parseVersion(md, file) {
  const m = md.match(/^\*\*Version:\*\*\s*([0-9]+\.[0-9]+)/m);
  if (!m) throw new Error(`No "**Version:** X.Y" header found in ${file}`);
  return m[1];
}

// Build a nested TOC from the rendered HTML's h2/h3 ids (guaranteed to match).
function buildToc(html) {
  const headings = [...html.matchAll(/<h([23]) id="([^"]+)">(.*?)<\/h\1>/gs)].map(
    ([, depth, id, text]) => ({ depth: Number(depth), id, text: text.replace(/<[^>]+>/g, "") })
  );
  if (headings.length === 0) return "";
  const sections = [];
  for (const h of headings) {
    if (h.depth === 2 || sections.length === 0) sections.push({ ...h, children: [] });
    else sections.at(-1).children.push(h);
  }
  const li = (h) =>
    `<li><a href="#${h.id}">${h.text}</a>${
      h.children?.length ? `<ol>${h.children.map(li).join("")}</ol>` : ""
    }</li>`;
  return `<nav class="toc" aria-label="Table of contents"><h2>Contents</h2><ol>${sections
    .map(li)
    .join("")}</ol></nav>`;
}

function page({ title, body, depth }) {
  const base = "../".repeat(depth);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="${base}assets/spec.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='7' fill='%234f46e5'/%3E%3C/svg%3E">
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

async function renderSpec(md, { version, isLatest }) {
  const html = marked.parse(md);
  const toc = buildToc(html);
  // The spec's first <hr> separates the header block from the Abstract — TOC goes there.
  const withToc = toc ? html.replace("<hr>", `<hr>${toc}`) : html;
  const rel = isLatest ? "latest" : `v${version}`;
  const dir = path.join(SITE, SPEC_PATH, rel);
  await mkdir(dir, { recursive: true });
  const banner = isLatest
    ? ""
    : `<p class="version-note">This is the frozen <strong>v${version}</strong> publication. The current version is at <a href="../latest/">latest</a>.</p>`;
  const footer = `<footer>
<p>Avatar Inc · <a href="did-method-avtr-v${version}.md">Source (Markdown)</a> ·
<a href="../latest/">Latest version</a></p>
</footer>`;
  const body = `${banner}<article>${withToc}</article>${footer}`;
  await writeFile(
    path.join(dir, "index.html"),
    page({ title: `did:avtr Method Specification v${version}`, body, depth: 3 })
  );
  await writeFile(path.join(dir, `did-method-avtr-v${version}.md`), md);
  return version;
}

async function main() {
  await rm(SITE, { recursive: true, force: true });
  await mkdir(SITE, { recursive: true });

  // 1. Current spec → /v<X.Y>/ and /latest/
  const current = await readFile(path.join(ROOT, "index.md"), "utf8");
  const version = parseVersion(current, "index.md");
  await renderSpec(current, { version, isLatest: false });
  await renderSpec(current, { version, isLatest: true });

  // 2. Frozen past versions (versions/vX.Y.md), if any
  const versionsDir = path.join(ROOT, "versions");
  const frozen = [];
  if (existsSync(versionsDir)) {
    for (const f of (await readdir(versionsDir)).filter((f) => f.endsWith(".md"))) {
      const md = await readFile(path.join(versionsDir, f), "utf8");
      const v = parseVersion(md, `versions/${f}`);
      if (v === version) continue; // current version wins
      await renderSpec(md, { version: v, isLatest: false });
      frozen.push(v);
    }
  }

  // 3. Directory index → redirect to latest (GitHub Pages has no server redirects)
  const redirect = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=latest/">
<title>did:avtr Method Specification</title>
</head>
<body>
<p><a href="latest/">Latest did:avtr method specification</a></p>
</body>
</html>
`;
  await writeFile(path.join(SITE, SPEC_PATH, "index.html"), redirect);

  // 4. Landing page
  const versionLinks = [version, ...frozen.sort().reverse()]
    .map((v) => `<a href="${SPEC_PATH}/v${v}/">v${v}</a>`)
    .join(" · ");
  const landing = `<h1>Avatar DID — published artifacts</h1>
<p><strong>Avatar Inc</strong> · the <code>did:avtr</code> Decentralized Identifier method
(biometric-rooted, device-anchored, self-sovereign human identity).</p>
<ul>
<li><strong>Method specification:</strong> <a href="${SPEC_PATH}/latest/">latest (v${version})</a> — versioned: ${versionLinks}</li>
</ul>
<footer><p>Avatar Inc · <a href="https://avatar.me">avatar.me</a></p></footer>`;
  await writeFile(
    path.join(SITE, "index.html"),
    page({ title: "Avatar DID — published artifacts", body: landing, depth: 0 })
  );

  // 5. Assets
  await mkdir(path.join(SITE, "assets"), { recursive: true });
  await cp(path.join(ROOT, "assets", "spec.css"), path.join(SITE, "assets", "spec.css"));

  console.log(
    `Built site/ — spec v${version} (latest + v${version}${
      frozen.length ? " + frozen: " + frozen.join(", ") : ""
    })`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
