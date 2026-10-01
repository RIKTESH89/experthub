# EXP13 representative human review — PENDING

These six synthetic cases come from actual local PostgreSQL extraction/retrieval. No model generation or human review has been performed. Automated tests do not substitute for semantic review. EXP13 remains a candidate pending human verification.

For each case mark Accept / Needs correction / Unclear and cite any problematic source span/field. Verify attribution, dates, reasons, constraints/exceptions and conflict handling against the exact wording. Dates have day precision: start-inclusive, until-exclusive, midnight UTC. Verify that this convention matches the intended wording; it is not a claim that all human uses of “until” have that meaning. Recorded time is ingestion time, not original publication time or proof of when a person held a view.

As-of uses still-current, presently authorized source revisions. It does not resurrect deleted/retired/restricted evidence or restore old permissions. Optional knownAt separately filters recorded-time availability. “As of YYYY-MM-DD, …” uses the existing question text; broader natural-language time planning is not implemented.

## R1: Dated contradiction periods

View: **as-of**, valid at 2024-06-01T00:00:00.000Z; recorded cutoff none.

- preference / positive: **monolith**; origin expert-authored; owner endorsement true.
  Domain: software architecture; context: small teams; validity 2024-01-01T00:00:00.000Z → 2025-01-01T00:00:00.000Z; source-explicit; explicit.
  Decision wording recommendation; reason UNKNOWN; constraints UNKNOWN; alternatives UNKNOWN; tradeoffs UNKNOWN; exceptions UNKNOWN.

Source ef3edc9bda45 (full identity in review-cases.json); UTF-16 span 31:126; recorded 2026-10-01T10:17:16.740Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> From 2024-01-01 until 2025-01-01, In software architecture, For small teams, I prefer monolith.

View: **current**, valid at 2026-06-01T00:00:00.000Z; recorded cutoff none.

- preference / negative: **monolith**; origin expert-authored; owner endorsement true.
  Domain: software architecture; context: small teams; validity 2025-01-01T00:00:00.000Z → UNKNOWN; source-explicit; explicit.

Source 54fbc1d5e516 (full identity in review-cases.json); UTF-16 span 31:116; recorded 2026-10-01T10:17:16.749Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> From 2025-01-01, In software architecture, For small teams, I do not prefer monolith.

- Verify: Do the source-declared periods justify the different current/as-of stances?

- Verify: Is recorded time kept separate from valid time, without inventing an original publication date?

## R2: Undated contradiction and unresolved choices

View: **current**, valid at 2026-06-01T00:00:00.000Z; recorded cutoff none.

- preference / positive: **services**; origin expert-authored; owner endorsement true.
  Domain: software architecture; context: small teams; validity UNKNOWN → UNKNOWN; source-explicit; explicit.
  Decision wording recommendation; reason UNKNOWN; constraints UNKNOWN; alternatives UNKNOWN; tradeoffs UNKNOWN; exceptions UNKNOWN.

- preference / positive: **monolith**; origin expert-authored; owner endorsement true.
  Domain: software architecture; context: small teams; validity UNKNOWN → UNKNOWN; source-explicit; explicit.
  Decision wording recommendation; reason UNKNOWN; constraints UNKNOWN; alternatives UNKNOWN; tradeoffs UNKNOWN; exceptions UNKNOWN.

- preference / negative: **monolith**; origin expert-authored; owner endorsement true.
  Domain: software architecture; context: small teams; validity UNKNOWN → UNKNOWN; source-explicit; explicit.

Relation: **unresolved-disagreement**, inferred; uncertainty: valid-time-unknown; do not resolve by recorded recency.

Relation: **unresolved-disagreement**, inferred; uncertainty: valid-time-unknown; do not resolve by recorded recency.

Relation: **contradiction**, inferred; uncertainty: valid-time-unknown; do not resolve by recorded recency.

Source f2ddbf75c412 (full identity in review-cases.json); UTF-16 span 31:92; recorded 2026-10-01T10:17:16.813Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> In software architecture, For small teams, I prefer services.

Source 9f04833de00b (full identity in review-cases.json); UTF-16 span 31:92; recorded 2026-10-01T10:17:16.798Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> In software architecture, For small teams, I prefer monolith.

Source 840ef16f7713 (full identity in review-cases.json); UTF-16 span 31:99; recorded 2026-10-01T10:17:16.805Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> In software architecture, For small teams, I do not prefer monolith.

- Verify: Should both source-backed views remain unresolved rather than newest-wins?

- Verify: Is the positive/negative contradiction distinguished from possibly compatible different preferences?

## R3: Decision case and missing reason

View: **current**, valid at 2026-06-01T00:00:00.000Z; recorded cutoff none.

- preference / positive: **a pilot**; origin expert-authored; owner endorsement true.
  Domain: software architecture; context: reversible trials; validity UNKNOWN → UNKNOWN; source-explicit; explicit.
  Decision wording recommendation; reason UNKNOWN; constraints UNKNOWN; alternatives UNKNOWN; tradeoffs UNKNOWN; exceptions UNKNOWN.

- decision / positive: **monolith**; origin expert-authored; owner endorsement true.
  Domain: software architecture; context: small teams; validity UNKNOWN → UNKNOWN; source-explicit; explicit.
  Decision wording documented-choice; reason operations capacity is limited; constraints two engineers; alternatives services; tradeoffs release independence; exceptions services when independent deployment is essential.

Source 1714e7435a58 (full identity in review-cases.json); UTF-16 span 31:100; recorded 2026-10-01T10:17:16.859Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> In software architecture, For reversible trials, I recommend a pilot.

Source a84233f6c69f (full identity in review-cases.json); UTF-16 span 31:277; recorded 2026-10-01T10:17:16.852Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> In software architecture, For small teams, I chose monolith because operations capacity is limited; constraints: two engineers; alternatives: services; tradeoff: release independence; exceptions: services when independent deployment is essential.

- Verify: Are situation, action, reasons, constraints, alternatives, tradeoffs and exceptions copied correctly from the spans?

- Verify: Does the other case correctly leave its undocumented reason unknown?

- Verify: Is the exception scoped to the documented constraint rather than global?

## R4: Author vs quote, description and visitor

View: **current**, valid at 2026-06-01T00:00:00.000Z; recorded cutoff none.

- preference / positive: **services**; origin visitor-claim; owner endorsement false.
  Domain: UNKNOWN; context: UNKNOWN; validity UNKNOWN → UNKNOWN; source-reported; explicit.
  Decision wording recommendation; reason UNKNOWN; constraints UNKNOWN; alternatives UNKNOWN; tradeoffs UNKNOWN; exceptions UNKNOWN.

- preference / positive: **monolith**; origin expert-authored; owner endorsement true.
  Domain: software architecture; context: small teams; validity UNKNOWN → UNKNOWN; source-explicit; explicit.
  Decision wording recommendation; reason UNKNOWN; constraints UNKNOWN; alternatives UNKNOWN; tradeoffs UNKNOWN; exceptions UNKNOWN.

- preference / positive: **services**; origin third-party-description; owner endorsement false.
  Domain: UNKNOWN; context: UNKNOWN; validity UNKNOWN → UNKNOWN; source-reported; explicit.
  Decision wording recommendation; reason UNKNOWN; constraints UNKNOWN; alternatives UNKNOWN; tradeoffs UNKNOWN; exceptions UNKNOWN.

- preference / negative: **monolith**; origin quote; owner endorsement false.
  Domain: software architecture; context: small teams; validity UNKNOWN → UNKNOWN; source-reported; explicit.

Source 48a9085d89be (full identity in review-cases.json); UTF-16 span 31:68; recorded 2026-10-01T10:17:16.916Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker quoted:Visitor; audience public.

> Visitor claimed: "I prefer services."

Source f4a17bdb195b (full identity in review-cases.json); UTF-16 span 31:92; recorded 2026-10-01T10:17:16.896Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> In software architecture, For small teams, I prefer monolith.

Source ada625a19429 (full identity in review-cases.json); UTF-16 span 31:52; recorded 2026-10-01T10:17:16.910Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker described:Ben; audience public.

> Ben prefers services.

Source 0bf6b9d92b05 (full identity in review-cases.json); UTF-16 span 31:111; recorded 2026-10-01T10:17:16.903Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker quoted:Ben; audience public.

> Ben said: "In software architecture, For small teams, I do not prefer monolith."

- Verify: Is only the authored expert view attributed to the expert?

- Verify: Are quotes, descriptions and visitor claims correctly separate?

- Verify: Does discussion of topics avoid creating personality or biography claims?

## R5: Documented principle and boundary

View: **current**, valid at 2026-06-01T00:00:00.000Z; recorded cutoff none.

- boundary / negative: **disclose confidential material**; origin expert-authored; owner endorsement true.
  Domain: UNKNOWN; context: UNKNOWN; validity UNKNOWN → UNKNOWN; source-explicit; explicit.

- principle / positive: **reversible decisions**; origin expert-authored; owner endorsement true.
  Domain: UNKNOWN; context: UNKNOWN; validity UNKNOWN → UNKNOWN; source-explicit; explicit.

Source f8b141f081e2 (full identity in review-cases.json); UTF-16 span 69:111; recorded 2026-10-01T10:17:16.960Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> I will not disclose confidential material.

Source d4ff663aa57f (full identity in review-cases.json); UTF-16 span 31:68; recorded 2026-10-01T10:17:16.960Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> My principle is reversible decisions.

- Verify: Do the exact source lines support these principle/boundary records?

- Verify: Are no unsupported decision links or personal motives added?

## R6: Dated source-declared supersession

View: **as-of**, valid at 2024-06-01T00:00:00.000Z; recorded cutoff none.

- preference / positive: **monolith**; origin expert-authored; owner endorsement true.
  Domain: software architecture; context: small teams; validity 2024-01-01T00:00:00.000Z → UNKNOWN; source-explicit; explicit.
  Decision wording recommendation; reason UNKNOWN; constraints UNKNOWN; alternatives UNKNOWN; tradeoffs UNKNOWN; exceptions UNKNOWN.

Source 867bae124545 (full identity in review-cases.json); UTF-16 span 31:109; recorded 2026-10-01T10:17:17.030Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> From 2024-01-01, In software architecture, For small teams, I prefer monolith.

View: **current**, valid at 2026-06-01T00:00:00.000Z; recorded cutoff none.

- preference / positive: **services**; origin expert-authored; owner endorsement true.
  Domain: software architecture; context: small teams; validity 2025-01-01T00:00:00.000Z → UNKNOWN; source-explicit; explicit.
  Decision wording recommendation; reason UNKNOWN; constraints UNKNOWN; alternatives UNKNOWN; tradeoffs UNKNOWN; exceptions UNKNOWN.

Relation: **supersedes**, explicit; uncertainty: source-declared dated replacement.

Source 75e8fd1dfe94 (full identity in review-cases.json); UTF-16 span 31:129; recorded 2026-10-01T10:17:17.037Z; author synthetic-exp13-owner; uploader synthetic-exp13-owner; speaker synthetic-exp13-owner; audience public.

> From 2025-01-01, In software architecture, For small teams, I prefer services instead of monolith.

- Verify: Does instead-of plus the declared date justify this replacement?

- Verify: Are both supporting spans auditable while only the appropriate current stance is served?

No reviewers were contacted; no ratings/sign-off are fabricated. The extractor is narrow and literal. Source-explicit means the source states it, not externally verified truth. Topic cooccurrence creates no personal attributes. See report.md for exact validation and limitations.
