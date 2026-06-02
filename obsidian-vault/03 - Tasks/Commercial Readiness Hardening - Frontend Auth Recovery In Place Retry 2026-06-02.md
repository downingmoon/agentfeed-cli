---
title: Commercial Readiness Hardening - Frontend Auth Recovery In Place Retry 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/ux
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Frontend auth recovery in-place retry
  - Auth recovery hard reload removal
---

# Frontend auth recovery in-place retry

> [!success]
> Auth/API recovery pages now use the AppContext `retryAuthCheck` path instead of hard page reloads, reducing reload loops and preserving app state during transient auth/API failures.

## Context

- Builds on [[Commercial Readiness Hardening - Frontend Auth Recovery and Notification Actions 2026-06-01]]
- Related app shell: `src/contexts/AppContext.tsx`
- Related pages: Dashboard, Notifications, Settings, Worklog Review

## Problem

Several auth recovery branches had explicit retry buttons but implemented them with `window.location.reload()`. In production, this can create brittle reload loops and discard in-memory state during transient API or session bootstrap failures. The app shell already exposes `retryAuthCheck`, so page-level recovery should reuse that controlled path.

## Contract

1. Dashboard auth/API recovery retry calls `retryAuthCheck`.
2. Notifications auth/API recovery retry calls `retryAuthCheck`.
3. Settings auth/API recovery retry calls `retryAuthCheck` and now consumes `apiConfigError` through `authRecoveryError = authError ?? apiConfigError`.
4. Worklog Review auth recovery retry calls `retryAuthCheck`.
5. Retry buttons expose `disabled={isLoading}` and `aria-busy={isLoading}`.
6. Production page sources must not contain `window.location.reload()` in these recovery branches.

## Changes

- Frontend `DashboardPage.tsx`
  - Destructures `retryAuthCheck` from `useApp()`.
  - Retry CTA now calls `retryAuthCheck` with pending state.
- Frontend `NotificationsPage.tsx`
  - Same in-place retry wiring.
- Frontend `SettingsPage.tsx`
  - Consumes `apiConfigError` and renders a shared auth/API recovery branch through `authRecoveryError`.
  - Retry CTA now calls `retryAuthCheck` with pending state.
- Frontend `WorklogReviewPage.tsx`
  - Retry CTA now calls `retryAuthCheck`; once auth succeeds, the existing review reload effect remains responsible for data loading.
- Frontend `page-source-contract.test.ts`
  - Replaced old `window.location.reload()` expectations with in-place retry/pending-state/no-hard-reload contracts.

## Verification evidence

> [!example] RED
> `npm run test` failed after changing the source contract because Dashboard still lacked `retryAuthCheck`.

> [!example] RED — sidecar gap
> Sidecar review found Settings still did not consume `apiConfigError`; after adding that contract, `npm run test` failed with `settings page must consume API config bootstrap failures`.

> [!success] GREEN — source contract
> `npm run test` passed after wiring all four pages to `retryAuthCheck` and aligning Settings with `authRecoveryError`.

> [!success] GREEN — no production hard reloads
> `rg -n "window\.location\.reload\(|onClick=\{retryAuthCheck\}|const authRecoveryError = authError \?\? apiConfigError|disabled=\{isLoading\} aria-busy=\{isLoading\}" src/components/pages src/lib/page-source-contract.test.ts` showed retry wiring and no production page reload matches.

> [!success] GREEN — full frontend CI
> `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` passed: typecheck, contracts, mock API compatibility, and production build.

> [!success] GREEN — dependency audit
> `npm audit --omit=dev --audit-level=moderate` passed with 0 vulnerabilities.

## Remaining risk

> [!warning]
> `retryAuthCheck` cannot repair a bad production `NEXT_PUBLIC_API_URL` deployment value by itself. It still provides a non-destructive in-place retry path; actual config/deployment errors remain surfaced through the recovery branch.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Frontend Mock API Compatibility CI Gate 2026-06-02]]
