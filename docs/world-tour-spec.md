# AdvertEYES World Tour — local rehearsal specification

2026-10-10. Current user direction overrides earlier 30-question/four-race timing and any sponsorship language. Original source specifications remain unchanged.

## Play and exact clock

Four knowledge tracks, ten questions per track. Every answer window is exactly 15 seconds. Every question has a 1.5-second reveal, including the last question in a track. Each track is followed by one 60-second commercial placeholder. There are no additional timed introductions or transitions.

- Track 1: 00:00–02:45; break 02:45–03:45
- Track 2: 03:45–06:30; break 06:30–07:30
- Track 3: 07:30–10:15; break 10:15–11:15
- Track 4: 11:15–14:00; post-play break 14:00–15:00

Forty × 15s = 600s answering; forty × 1.5s = 60s reveal; four × 60s = 240s commercials; total 900s. The last answer locks at 13:58.5; final results are available through the last reveal and displayed during the fourth break. Nobody must finish or even load an ad to receive results. The prototype serves no advertising and contacts no ad service.

Explanations remain in an expandable completed-question history. A brief reveal is not presented as sufficient reading time. No literal vehicles, no reaction-time bonus, no skipped answer windows due to advertising.

## Score and fairness

Each correct answer earns ten progress units. Shared ranks remain shared. Inventory, progress and correct-answer item cadence reset for each ten-question track. Existing directional effects and two bounded leader checkpoint opportunities are retained with a 100-unit track target. Sixteen rivals are explicitly labeled deterministic simulations, not live people.

The original best-single-race-of-four qualification rule remains the governing design intent. The UI shows each completed track, highest single-track progress and a separate tour accuracy total. It does not declare an officially qualified winner. Raw scores on increasingly difficult packs are not comparable; automatically favoring the first/easiest track would be unfair.

Decision still needed for production:
1. Keep best-one-of-four with independently calibrated, matched-difficulty forms and a difficulty ramp reset inside each track.
2. Explicitly change qualification to a cumulative forty-question format if the owner chooses a single global difficulty ascent.

No covert normalization, new cutoff or speed tiebreak is introduced. The current 40-question bank is a draft, source/key checked but not statistically or human-timing calibrated. Estimated bands are not proof of a strictly monotonic challenge or elite difficulty. A stronger final-track proposal is separate from the frozen playable bank.

Independent uniform blind guesses on four options produce a 40/40 probability of 4^-40 (about 8.27×10^-25). Harder wording does not change that probability. It is not an event-win probability. Best-of-four scoring has a different distribution; none of this proves that a perfect score is impossible.

## Authority, recovery and auditability

The tour stores its exact timing, seed and question-pack fingerprints before play. Each pack uses the existing fsynced receipt journal, server cutoff, monotonic revision and deterministic scoring. Future pack state is never projected to the browser. Completed questions alone gain answers, explanations and evidence links. Reconnect catches up missed turns and preserves accepted submissions. Old receipt retries remain idempotent across breaks.

Every tour contains four pack replays and a final fingerprint binding the manifest and pack result hashes. Bank-fingerprint mismatch stops replay rather than silently applying changed questions. Legacy thirty-question replays/tests remain supported. These are reproducibility checks, not a claim of an externally signed or tamper-proof public audit.

This remains one local human session against simulations, not global synchronized multiplayer. No passkeys, production eligibility, real prizes, commercial sales or public deployment are implemented. Browser/phone visual verification is still blocked by local Chromium IPC restrictions.

## Original source reconciliation

Read in full: susan-b-game-first-master-plan.md, susan-b-complete-game-engineering-spec.md and susan-b-technical-product-spec.md in the recovered source directory. Preserve game-first design, minimum personal data, authoritative fairness, truthful simulations, progress-only effects, evidence-backed product comparisons, distinct trivia winner/evaluator roles, and no manufactured outcomes. Latest requirements supersede literal karts, older question counts, older timing proposals and all sponsorship framing.
