---
title: Frontend GitHub Avatar Coverage 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/contracts
  - ui
  - avatar
  - completed
status: completed
---

# Frontend GitHub Avatar Coverage 2026-06-08

> [!success]
> Feed/worklog/user-related surfaces now preserve GitHub profile images from backend `avatar_url` through backend contracts, frontend adapters, and rendering helpers.

## Problem

Backend `PublicUser.avatar_url` was already available, and `adaptUser()` correctly mapped it to `User.avatarUrl`, but some frontend display helpers discarded or never surfaced that field. A second pass found two remaining text-only user identity surfaces and several API contract gaps that could allow future avatar regressions.

## Fix summary

- [[Integration - CLI Backend Frontend]]
  - `getWorklogAuthor()` now preserves hydrated `_author.avatarUrl`.
  - Feed sidebar trending worklogs now resolve `_author` through `getWorklogAuthor()` and render `Avatar` instead of only `@author` text.
  - Project adapters now keep `ownerUser` so project owner GitHub avatars are available outside worklog cards.
  - Project owner avatar rendering added to:
    - `/projects` cards
    - `/search` project results
    - `/explore` trending projects
    - `/projects/:owner/:slug` detail hero
- 2026-06-08 hardening pass:
  - `/profile/:username` project cards now render the owner GitHub avatar, not only text.
  - `/settings` profile identity panel now renders the signed-in user's GitHub avatar.
  - Backend `/users/{username}/projects` now includes `owner: PublicUser` so profile project cards receive `avatar_url` without guessing.
  - Dev OpenAPI gate now requires `avatar_url` across visible user identity payloads:
    - feed/worklog authors
    - worklog comment authors
    - search users and prompt authors
    - leaderboard users
    - explore popular prompt authors and rising builders
    - notification actors
    - project owners

## Regression coverage

- Added `src/lib/worklog-author-avatar.contract.test.ts`.
- Extended `src/lib/page-source-contract.test.ts` to require `Avatar` usage in profile project cards and the settings identity panel.
- Extended API/source contracts for:
  - worklog author avatar preservation
  - project owner avatar preservation
  - feed trending avatar rendering
  - project owner avatar rendering surfaces
  - visible user actor `avatar_url` fields across feed, comments, search, leaderboard, explore, notifications, and user profile project summaries

## Verification

- RED evidence before implementation:
  - Frontend page-source contract failed until profile project cards rendered `Avatar`.
  - Dev contract grep failed until `data[].author.avatar_url` was included in the OpenAPI gate.
- Frontend:
  - `npm test` ✅
  - `npm run lint` ✅
- Backend:
  - `uv run pytest -q` ✅ — 398 passed, 1 warning
  - `uv run ruff check .` ✅
- Dev/orchestrator:
  - `node scripts/check-openapi-contract.mjs` ✅ — 75 operations, 70 client contracts, 30 response field contracts, 111 request fields, 127 schema fields
  - `bash scripts/test-all.sh` ✅ — CLI release preflight, frontend test/lint/build/API compatibility, backend ruff/pytest/offline Alembic chain all passed
- Previous visual/build evidence:
  - `AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 NEXT_PUBLIC_API_URL=https://api.example.com/v1 NEXT_PUBLIC_REVIEW_BASE_URL=https://example.com npm run build` ✅
  - Local smoke: `curl -I http://localhost:3037/feed` returned `HTTP/1.1 200 OK` ✅

## Follow-up

- No server deployment was performed in this pass; server/infra/CICD work remains intentionally on hold.
- If `/search/suggestions` later renders user suggestion rows, add `avatar_url` to that suggestion payload and display it with `Avatar` before exposing it as a user-facing identity surface.
