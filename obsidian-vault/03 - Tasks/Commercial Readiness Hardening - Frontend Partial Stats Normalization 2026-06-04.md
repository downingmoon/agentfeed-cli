---
title: Frontend Partial Stats Normalization
date: 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - api-contract
  - runtime-safety
status: verified
related:
  - "[[Commercial Readiness Hardening - Backend User Public Stats Aggregation 2026-06-04]]"
  - "[[Commercial Readiness Hardening - Backend Public Project Stats Aggregation 2026-06-04]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Frontend Partial Stats Normalization

> [!success] Verified
> Frontend API normalizers now tolerate missing `stats` on public user/profile and wrapped project-detail payloads instead of letting a partial backend payload crash render paths.

## Why

Recent backend hardening made stats surfaces more efficient, but commercial frontend stability also needs partial-payload tolerance during deploy drift, stale responses, or section-specific API reuse.

Previously:

- `normalizeUserPublic(data)` assumed `data.stats` existed.
- wrapped project detail normalization only handled `{ project, stats }`; if a partial wrapper returned `{ project }`, the wrapper could be misread as a detail object.

## Change

- Added empty defaults for user stats and project stats in `src/lib/api.ts`.
- Kept `ApiUserPublic.stats` required at the frontend boundary because `normalizeUserPublic` always fills defaults.
- Made backend input stats optional/null for partial payload safety.
- Changed project detail wrapper normalization to key off `project` presence, not `project + stats` presence.
- Added contract tests for:
  - public user payload without stats,
  - owner-aware wrapped project detail without stats.

## Verification

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts
npm run lint
NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build
```

Result:

- Contract tests passed.
- Typecheck/lint passed.
- Next production build passed for 18 app routes.

## Notes

> [!warning] Hosted production gate
> This local frontend build can compile against `https://api.agentfeed.dev`, but hosted CI/live E2E still depends on the unresolved hosted DNS/root deployment blockers.
