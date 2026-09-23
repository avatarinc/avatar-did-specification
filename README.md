# avatar-did-specification

The **`did:avtr` DID method specification** (Avatar Inc) and the pipeline that publishes it at
**https://docs.avatar.me**.

## Published URLs

| Artifact | URL |
|---|---|
| Landing | https://docs.avatar.me/ |
| Spec — latest | https://docs.avatar.me/specs/did-method-avtr/latest/ |
| Spec — v1.0 | https://docs.avatar.me/specs/did-method-avtr/v1.0/ |

## Repository layout

| File | Role |
|---|---|
| `index.md` | The specification as published; the build derives the version from its `**Version:**` header |
| `avtr.json` | W3C DID method registry entry |
| `versions/` | Frozen snapshots of past spec versions (created on version bump; rendered alongside current) |
| `build.mjs`, `assets/spec.css` | Static site build (Node + marked, no framework) |
| `.github/workflows/publish.yml` | Build + deploy to GitHub Pages on every push to `main` |

## Publishing

Every push to `main` republishes the site. Locally:

```bash
npm install
npm run build      # renders site/
npm run preview    # serves site/ at http://localhost:8788
```

## Releasing a new spec version (e.g. v1.1)

1. Freeze the current spec: `cp index.md versions/v1.0.md` (keep its `**Version:** 1.0` header).
2. Replace `index.md` with the new version (bump the `**Version:**` header).
3. Push to `main`. The build emits the new version + `latest`, and keeps every `versions/*.md` at its frozen URL.

## Copyright

© Avatar Inc. This specification may be reproduced and distributed, without modification, for the purpose
of building resolvers for, or reviewing, the method it describes.
