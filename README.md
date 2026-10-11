# AdvertEYES · World Tour

A local four-track trivia rehearsal: 40 questions, exactly 15 seconds each, four minutes of clearly labeled commercial placeholders, 15 minutes total. Knowledge earns progress, never reaction time. No literal karts, sponsorships, ad services or external tracking.

## Run locally

Node 24 and npm are required. All dependencies are pinned; this update adds none.

```
npm ci
npm run check
npm start
```

Open http://127.0.0.1:4173. `check` includes the client build. Use `PORT=4180 npm start` for another local port. The service binds to loopback only. If your npm cache is unwritable, use `npm_config_cache=$PWD/.npm-cache npm ci`; preserve normal TLS and the public registry.

## Format

Four ten-question packs: First Light, Crossroads, Hidden Systems, The Summit. Each track lasts 165 seconds (10 × 15-second answers plus 1.5-second reveals). A 60-second placeholder break follows each, including a final results-visible break. Total: 900 seconds. No additional timed intro or transition. Explanations remain available in completed-question review history.

Sixteen rivals are plainly labeled simulations. Correct answers earn ten progress units; inventory and score reset each track. Pulse disrupts ahead; Echo behind; capped Surge opportunities compress leaders. Effects never obstruct answering. Tied scores share ranks. Original best-one-of-four qualification intent is retained, but **official qualification is disabled** because the increasingly difficult draft packs are not score-equated. Cumulative accuracy is a separate tour summary, not a secretly changed qualification rule.

The running bank’s facts and remapped keys were independently desk-reviewed. Difficulty is an uncalibrated estimate, not demonstrated monotonic or elite difficulty. A stronger final-track proposal remains separate and unimplemented.

## Documents

- docs/world-tour-spec.md — exact timeline, fairness and unresolved qualification choices
- docs/world-tour-question-bank.md — all 40 questions, choices, answers, explanations and source links (spoilers)
- docs/final-track-candidates.md — stronger final-track proposal, not running content
- docs/commercial-independence-draft.md — no-sponsorship, conflict/ownership review, donor-funded costs/tax gross-up and privacy-preserving transparency requirements; counsel-review draft only

## Verification

```
npm run check
npm run replay -- evidence/sample-replay.json
npm run replay -- evidence/world-tour-replay.json
```

The original 29 tests remain, including Host/static-directory process-survival, same-version stale-snapshot, server-cutoff, durability and legacy replay regressions. New tests cover four-pack lifecycle, breaks, future-answer isolation, persistent review history, per-track resets, idempotent retries across breaks, question-bank fingerprints and default 900-second timing.

`npm run test:e2e` is checked in for a compatible Chromium environment. Browser execution remains BLOCKED here by local IPC restrictions; no new browser launches, screenshots, visual pass or actual-device claim were made. Config requires chromiumSandbox:true. Browser selectors and reveal timeout match World Tour, but execution remains unverified and is not counted among passed tests. Start the current server before running that suite.

## Architecture and limits

- src/domain/questions.ts: legacy 30-question bank, retained for old replay compatibility
- src/domain/world-packs.ts: versioned 40-question bank, evidence and choice permutations
- src/domain/rules.ts: shared pure deterministic scoring
- src/server/authority.ts: durable per-pack receipts and score authority
- src/server/tour-authority.ts: persisted tour manifest and four-authority schedule
- src/server/http.ts: bounded loopback HTTP service
- src/web: semantic React presentation, break/result panels and completed-question review

The manifest freezes timing and question fingerprints. Replays include four pack journals; fingerprint mismatches reject silently changed content. These checks establish reproducibility, not external signatures or proof against every form of tampering. Run only one authority process over a data directory. Production rate limits, retention, global multiplayer synchronization, passkeys, eligibility, lightning and actual prize/advertising workflows are not implemented.

No legal agreement is executed by the policy draft. No private emails, financial data, donor/participant identities, credentials or real advertising are included. No remote repo, push, upload or deployment has occurred. Git remains an uncommitted local branch. Source checksums: evidence/source-manifest.sha256.
