---
title: Frontend UI UX Polish Stage 10 2026-06-06
date: 2026-06-06
tags:
  - agentfeed/frontend
  - agentfeed/ui-ux
  - agentfeed/accessibility
  - agentfeed/visual-qa
  - agentfeed/evidence
status: completed
aliases:
  - Browser visual landmark QA
---

# Frontend UI UX Polish Stage 10 2026-06-06

## Scope

Stage 10 converted the Stage 9 follow-up into real browser evidence. The focus was not a new feature; it was screenshot-level verification of core public/static/auth-loading surfaces and fixing any UI/UX polish gaps found by rendered DOM evidence.

Related stages: [[Frontend UI UX Polish Stage 9 2026-06-06]].

## Browser QA coverage

Temporary Playwright/Chromium was installed under `/tmp/agentfeed-stage10-playwright` and used against a local Next dev server at `http://127.0.0.1:3108`.

Scenarios:

| Scenario | URL | Viewport | Result |
| --- | --- | --- | --- |
| Landing desktop | `/` | `1440x1000` | `200`, no horizontal overflow, `main` present, `h1` present |
| Feed mobile | `/feed` | `390x844` | `200`, no horizontal overflow, `main` present, `h1` present |
| Docs desktop | `/docs` | `1440x1000` | `200`, no horizontal overflow, `main` present, `h1` present |
| 404 mobile | `/missing-stage-10-route` | `390x844` | `404`, no horizontal overflow, `main` present, `h1` present |
| Dashboard desktop | `/dashboard` | `1440x1000` | `200`, no horizontal overflow, `main` present, `h1` present |
| Notifications mobile | `/notifications` | `390x844` | `200`, no horizontal overflow, `main` present, `h1` present |

> [!info] Local API condition
> This QA intentionally ran with the backend unavailable at `http://localhost:8000`. Therefore the global API contract warning banner and signed-out/auth-redirect loading states were visible. The evidence is valid for public/static resilience, responsive layout, and auth-loading polish, but it does not replace the remaining authenticated success-state QA.

## Issue found

The first browser run showed that several polished-looking surfaces were still missing semantic structure in actual rendered DOM:

- Landing and static info pages had visible headings but no `main` landmark.
- Dashboard and Notifications auth-loading skeleton states had no visible `h1` and no `main` landmark.
- The dashboard/notifications skeletons felt too anonymous: users saw only bars while auth redirect/session checks were happening.

## Changes

### Main landmark polish

- `LandingPage` now renders its public hero/content through `<main className="landing">`.
- `InfoPage` now renders static Docs/Privacy/Terms/Changelog content through `<main className="info-page-shell">`.
- `DashboardPage` and `NotificationsPage` now use `<main>` for auth recovery, loaded content, and loading skeleton states.

### Auth-loading visual clarity

- Dashboard skeleton now keeps the real page identity visible: badge, `AgentFeed dashboard` heading, and state-specific loading copy.
- Notifications skeleton now keeps the real page identity visible: badge, `AgentFeed 알림` heading, and state-specific loading copy.
- Existing skeleton rows remain, but the page no longer feels like an unlabelled placeholder slab.

### Contract coverage

- Source-contract tests now require `main` landmarks for Landing and InfoPage.
- Source-contract tests now require Dashboard and Notifications loaded/skeleton main landmarks.
- Source-contract tests now require visible `h1` headings for Dashboard and Notifications skeleton/loaded states.

## Verification

> [!success] Passed
> - `npm test`
> - `npm run lint`
> - `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build`
> - Browser smoke after fix: 6/6 scenarios returned expected status, no horizontal overflow, `main=true`, `h1` present.
> - Screenshot inspection: updated dashboard and notifications auth-loading states now show branded page identity instead of anonymous skeleton-only cards.

> [!warning] Transient dev-server note
> Running `next build` while an existing `next dev` server was still active caused temporary `.next` development manifest `ENOENT` 500 responses. Restarting the dev server restored normal `200/404` responses and the browser smoke passed. This was a local verification sequencing issue, not a source regression.

> [!success] Cleanup
> The temporary Next dev server was stopped. Residual checks for `next dev`, `playwright-mcp`, `@playwright/mcp`, `/tmp/agentfeed-stage10-playwright`, `chrome-headless-shell`, and `ms-playwright` returned no running processes.

## Files

- `agentfeed-frontend/src/components/pages/LandingPage.tsx`
- `agentfeed-frontend/src/components/pages/InfoPage.tsx`
- `agentfeed-frontend/src/components/pages/DashboardPage.tsx`
- `agentfeed-frontend/src/components/pages/NotificationsPage.tsx`
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`

## Remaining UI/UX follow-up

- Authenticated success-state visual QA is still required before completing the frontend polish goal:
  - profile follow/unfollow,
  - project edit/view transitions,
  - settings token create/revoke/rotate confirmation panels,
  - worklog review publish controls,
  - notification read/mark-all-read,
  - moderation report status actions.
- A final goal completion audit must compare current frontend behavior against the full commercial-grade UI/UX objective before marking the goal complete.
