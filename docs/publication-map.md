# Source-only publication map

Status: prepared locally; no commit or push authorized by this file. Repository access and signed publication route must be independently verified before publishing. Do not reuse another project's credentials.

## Explicit allowlist

`publication-files.txt` lists every proposed public file, relative to the project root. It includes source code, tests, reproducibility/configuration files, user-facing specifications, the draft question bank with spoilers, the separately proposed final-track questions, draft commercial policy, and synthetic demo replays. These replays use generated local demo identifiers and scripted test input, not participant records.

The pending policy/specification content is clearly labeled draft or unresolved. Nothing here executes a legal agreement. Public question-bank disclosure means this fixed demo bank is unsuitable as a secret live competition bank.

## Excluded

- `.data/`, runtime sessions, cookies and participant records
- `node_modules/`, `.npm-cache/`, `dist/`, browser reports and screenshots
- `.git/`, credentials, environment secrets and signing material
- Original conversation transcripts, internal prompts, raw command logs and implementation work ledger
- Private review drafts, raw videos, correspondence or financial records

Use the explicit list rather than recursively adding the directory. Recheck the list and each file's contents before any public push. The local full-source checksum manifest is for local verification; it includes excluded development documentation and is not itself the publication allowlist.

## Reproducible release bundle

A local source-only tar archive is prepared from this allowlist, with regular files normalized to mode 0644, owner/group 0 and timestamp 0. A separate JSON manifest records each archive path, mode, byte length and SHA256. The archive SHA256 is also recorded separately. These bundle records live outside the project and contain no credentials. The pre-CI source freeze is preserved separately. Verify archive entries against the JSON manifest before any authorized publication.
