---
title: Frontend GitHub Avatar Coverage 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/frontend
  - ui
  - avatar
  - completed
status: completed
---

# Frontend GitHub Avatar Coverage 2026-06-08

> [!success]
> Feed/worklog/user-related surfaces now preserve GitHub profile images from backend `avatar_url` through frontend adapters and rendering helpers.

## Problem

Backend `PublicUser.avatar_url` was already available, and `adaptUser()` correctly mapped it to `User.avatarUrl`, but some frontend display helpers discarded or never surfaced that field.

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

## Regression coverage

- Added `src/lib/worklog-author-avatar.contract.test.ts`.
- Extended API/source contracts for:
  - worklog author avatar preservation
  - project owner avatar preservation
  - feed trending avatar rendering
  - project owner avatar rendering surfaces

## Verification

- `npm test` ✅
- `npm run lint` ✅
- `AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 NEXT_PUBLIC_API_URL=https://api.example.com/v1 NEXT_PUBLIC_REVIEW_BASE_URL=https://example.com npm run build` ✅
- Local smoke: `curl -I http://localhost:3037/feed` returned `HTTP/1.1 200 OK` ✅

## Notes

Browser MCP transport was unavailable during this pass, so visual confirmation used local HTTP smoke plus contract/type/build evidence.
