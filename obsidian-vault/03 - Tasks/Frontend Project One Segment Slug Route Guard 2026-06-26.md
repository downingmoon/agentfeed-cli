---
title: Frontend Project One Segment Slug Route Guard 2026-06-26
date: 2026-06-26
status: complete
tags:
  - agentfeed/frontend
  - agentfeed/qa
  - agentfeed/deploy
---

# Frontend Project One Segment Slug Route Guard 2026-06-26

## Summary

Human QA sweep hit `/projects/carrot-platform-v2-web` and the frontend rendered `프로젝트 API 오류` / `Invalid request` because the one-segment project route treated an owner-scoped slug as a project id and called backend `/v1/projects/{project_id}`. Backend correctly returned `422` because that path expects a UUID.

## Fix

- `agentfeed-frontend/src/lib/project-path.ts`
  - Added `isProjectIdRouteSegment()` UUID route guard.
- `agentfeed-frontend/src/app/projects/[...projectPath]/page.tsx`
  - One-segment `/projects/:id` now only accepts UUID project ids.
  - Non-UUID one-segment slugs now stop at Next `notFound()` instead of calling the UUID API.
- `agentfeed-frontend/src/lib/url-navigation-contract-fixtures.ts`
  - Added regression contract: UUID ids allowed, owner-scoped slugs rejected before reaching UUID API.

## Verification

- Red: `npm run test:contracts -- src/lib/url-navigation-contracts.contract.test.ts` failed on missing `isProjectIdRouteSegment`.
- Green: targeted contract passed.
- Full frontend contracts passed.
- `npm run lint` passed.
- Production build passed with `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev`.
- Deployed frontend-only on current server `trading-bot` via local rsync + Docker Compose force-recreate. No SSH.
- Targeted Playwright QA:
  - `/projects/carrot-platform-v2-web` returns intentional `404`.
  - No `/v1/projects/carrot-platform-v2-web` backend call.
  - No `프로젝트 API 오류`, `Invalid request`, or internal server error text.
- Surface Playwright sweep passed: `SUMMARY pass=16 fail=0`.

## Follow-up

- Project slugs remain owner-scoped. Public links should continue using `/projects/{owner}/{slug}` whenever owner is known.
