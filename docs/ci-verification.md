# Quality workflow

Every push and pull-request update schedules `Node 24 quality` on an Ubuntu 24.04 GitHub-hosted runner. Superseded runs for the same ref/PR are canceled; the job has a ten-minute limit. It installs the committed lockfile with `npm ci` from public npm using normal TLS, runs typecheck/lint/37 tests/client build, then verifies both synthetic replays. Browser tests are not run and no browser pass is claimed.

Permissions are limited to `contents: read`. Checkout does not persist credentials. No secrets, deployment, artifact upload, write permission, `pull_request_target` event or interpolated shell inputs are used. Do not provide repository secrets or elevated permissions to this workflow. Fork PRs use the ordinary unprivileged pull-request event.

## Action provenance

Official upstream tag refs were checked read-only with `git ls-remote` on 2026-10-11:

- https://github.com/actions/checkout/tree/v4.2.2 → `11bd71901bbe5b1630ceea73d27597364c9af683`
- https://github.com/actions/setup-node/tree/v4.4.0 → `49933ea5288caeca8642d1e84afbd3f7d6820020`

The workflow uses those full commit IDs rather than mutable tag references. Node is selected at major 24; installed npm dependencies are locked exactly. Local YAML parsing and policy assertions verify triggers, permissions, action pins, timing, credential non-persistence and commands. This static check is not a GitHub-hosted execution; the first actual run must be checked after authorized publication. Required-check branch protection is separate repository configuration and is not configured by this file.
