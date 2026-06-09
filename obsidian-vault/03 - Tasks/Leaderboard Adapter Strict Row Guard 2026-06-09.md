---
title: Leaderboard Adapter Strict Row Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - contracts
  - leaderboard
  - public-surface
status: done
related:
  - "[[Collection Evidence Strict Agent Metrics Guard 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Leaderboard Adapter Strict Row Guard 2026-06-09

> [!success]
> Public leaderboard page-level adapter no longer casts raw ranking rows as `ApiLeaderboardItem`. Rows are reconstructed from explicitly validated public fields.

## Why

이전 follow-up은 Frontend helper/adapters의 broad cast가 API contract drift를 숨길 수 있는지 계속 점검하는 것이었다. 스캔 결과 `src/lib/leaderboard-adapter.ts`가 rank/user/metric/viewer state를 일부 확인한 뒤 마지막에 `item as unknown as ApiLeaderboardItem`으로 raw row 전체를 통과시키고 있었다.

Leaderboard는 public ranking surface이므로, `email`, `raw_payload`, debug/private stats 같은 field가 API나 fixture drift로 섞일 경우 UI 경계에서 즉시 실패해야 한다.

## What changed

- `safeLeaderboardItems()`
  - row-level raw cast 제거.
  - `rank`, `user`, `main_metric`, `secondary_metric`, `viewer_state`만 허용.
  - 허용 외 row field는 fail-closed.
- `safeUser()`
  - public user field allowlist 적용.
  - `id` 또는 `username` fallback 정책은 유지하되, 제공된 `id`가 비문자열이면 reject.
  - `stats`와 `viewer_state`도 명시 검증.
- `safeStats()`
  - leaderboard user stats의 public aggregate field만 허용.
  - count/aggregate는 non-negative number 또는 nullable aggregate만 허용.
- `safeMetric()`
  - `label`, `value`만 허용.
  - value는 non-empty string 또는 non-negative finite number만 허용.
- Frontend contract tests
  - unexpected row raw payload
  - user private email
  - stats raw cost/debug payload
  - metric debug payload
  - 위 케이스가 모두 `Leaderboard API returned malformed ranking rows`로 실패하는지 고정.

## Verification

- Frontend contract tests:
  - `npm test -- src/lib/api-contract.test.ts src/lib/page-source-contract.test.ts`
  - Result: passed.
- Frontend typecheck/lint:
  - `npm run lint`
  - Result: passed.
- Risk-pattern rescan:
  - `rg "return item as unknown as ApiLeaderboardItem|as unknown as ApiLeaderboardItem|\\[extraKey: string\\]" src/lib/leaderboard-adapter.ts src/lib/api.ts`
  - Result: no matches.
- Dev OpenAPI gate:
  - `node --check scripts/check-openapi-contract.mjs`
  - `node scripts/check-openapi-contract.mjs`
  - Result: passed.

## Follow-up

> [!todo]
> Continue scanning remaining `src/lib/adapters.ts` casts such as project/social stats helpers and either prove they are fully guarded or replace them with explicit reconstruction.

> [!info]
> 서버/인프라/CICD/개인서버 배포는 active goal 규칙에 따라 수행하지 않았다.
