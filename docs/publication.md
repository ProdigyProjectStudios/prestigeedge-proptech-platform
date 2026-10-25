# PrestigeEdge · Verification and publication

## Repository preparation

**Status: public GitHub publication authorized by the project owner.**

The case-study package follows the user's reference standard: a client-work narrative, advanced features near the top, direct implementation links, architecture diagrams, and an explicit separation between established foundations and later development.

Repository: **[ProdigyProjectStudios/prestigeedge-proptech-platform](https://github.com/ProdigyProjectStudios/prestigeedge-proptech-platform)**. Visibility: public. No private client name, commercial result, or delivery history has been invented.

## Public snapshot policy

The snapshot is generated independently of the workspace's Git history. It includes application source, configuration templates, the technical documentation, screenshots, and image-only upload assets. It excludes all chat attachments, raw photo archives, previous marketplace/handover collateral, agent memory, real environment configuration, and generated build output. Account-autofill credentials are removed in the exported login component without modifying the working application's login experience.

The export script checks text files for selected credential patterns and exact configured secrets without displaying values. This is a targeted credential check, not a comprehensive security audit, license review, or guarantee that media is freely redistributable.

The original package licensing metadata is preserved. Type-check limitations remain recorded below; publication does not turn those checks into passes.

## Verification record

| Check | Outcome |
| --- | --- |
| Public homepage capture | Captured from the running application; `screenshots/home.jpg` |
| Deal Room entry capture | Captured from the running application; `screenshots/deal-room.jpg` |
| TypeScript check | Does not pass in the existing application; failures include dashboard query typing, an icon import, storage insert types, and generated chat-integration/schema mismatches |
| Production build | Passed: Vite client build and esbuild server bundle |
| Documentation link check | Passed: 41 relative documentation links resolve |
| Tracked-file inventory | Completed: 513 tracked files; two photo archives over 10 MB flagged; no configured sensitive-filename match |
| Authenticated dashboard captures | Not captured in this pass |
| Live AI provider evaluation | Not run; no paid calls made for documentation preparation |
| End-to-end transaction test | Not run in this documentation pass |

Browser capture confirms those public screens rendered; it is not an interaction test. Logs showed blocked external fonts and the development banner under CSP, plus unconfigured Google Analytics. These are configuration observations, not a claim that the advanced workflows were exercised.

The TypeScript failures predate this documentation-only preparation. No application source was modified to suppress errors or narrow the compiler's include list. Type remediation is a release-quality workstream before claiming a clean type check or configuring mandatory green CI.

The inventory reports 125 tracked upload files, 226 attached assets, and ten legacy commercial/access-review documents for packaging review. These counts describe the working snapshot, not the intended public export.

## Release gates

### 1 · Curated export

The working repository includes historical handover, valuation, marketplace-sales, and access-test documents. They are not the new client-work narrative and must be reviewed before inclusion. Do not publish legacy credentials, unsupported financial/performance claims, or unrelated sales material.

The preparation preserves those files locally. Ignoring a file does not remove it from tracked files or Git history. Use a reviewed clean export or an explicitly approved history-sanitization process; do not force-push or rewrite the working project's history as a side effect.

### 2 · Asset governance

`uploads/` and `attached_assets/` contain substantial tracked media. Review source, redistribution permission, personal data, usage references, and file sizes. Some images may be necessary for the application; indiscriminate removal can break the showcase.

Screenshots under `docs/screenshots/` show the running public interface. They demonstrate presentation, not ownership of pictured properties or verified market data.

### 3 · Credential and data review

Review the chosen export and its history with an appropriate secret-scanning tool. The included inventory script only checks tracked filenames, sizes, and review groups; it does not scan file contents or certify absence of secrets.

Do not export environment files, database dumps, session tokens, signing credentials, private customer records, or the repository-maintenance token. The blank `.env.example` is safe configuration documentation, not a credential file.

### 4 · Licensing and attribution

The package currently declares MIT. The user's reference repositories use restricted portfolio licensing, but this package has not been relicensed. Confirm ownership and intended source permissions before adding a restrictive license or publishing.

### 5 · Evidence and operational readiness

Record actual type/build results. Capture authenticated dashboard tools using a fictional review account before claiming that screenshots cover those experiences.

The next engineering stages include validated AI outputs and provenance, durable Deal Room state, verified signing callbacks, production identity controls, and cross-platform confidential-inventory classification. These are architectural extensions, not integrations represented as already live.

## Commands

```bash
npm run check
npm run build
node scripts/repository-preflight.mjs
git diff --check
```

A successful inventory exit code means no configured filename/size blocker was found. It does **not** mean the repository is cleared for publication.
