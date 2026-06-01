---
title: Commercial Readiness Hardening - Frontend Review Feed Token Safety 2026-06-02
aliases:
  - Frontend stale review publish preflight
  - Frontend feed filter keyboard support
  - Frontend one-time token memory clearing
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/privacy
  - agentfeed/accessibility
status: done
created: 2026-06-02
repositories:
  - agentfeed-frontend
---

# Commercial Readiness Hardening - Frontend Review Feed Token Safety 2026-06-02

## 목표

> [!abstract]
> Review publish, feed filtering, Settings token copy flow의 stale state / keyboard access / secret memory retention 위험을 launch-blocking 수준에서 줄입니다.

## 변경 계약

### Review publish stale-state preflight

- Review page publish action은 `worklogs.publish()` 전에 `worklogs.review(worklogId)`를 다시 호출합니다.
- Fresh review payload에서 privacy findings와 preview safety를 재계산합니다.
- Fresh state가 unsafe이면 publish를 호출하지 않고 visible error를 표시하며 review state를 최신 payload로 갱신합니다.

### Feed filter keyboard accessibility

- Filter trigger는 `Enter`, `Space`, `ArrowDown`으로 listbox를 열 수 있습니다.
- Option list는 `ArrowUp` / `ArrowDown`, `Home` / `End`, `Enter` / `Space`, `Escape`를 처리합니다.
- Keyboard close/selection 후 focus는 trigger로 돌아갑니다.
- `aria-expanded`는 open state와 동기화됩니다.

### One-time ingestion token secret clearing

- Settings page에서 one-time token copy가 성공하면 `oneTimeSecret` state를 즉시 `null`로 지웁니다.
- Reveal state와 token panel copy message도 함께 지워 재표시를 막습니다.
- 사용자는 non-secret page-level success confirmation만 봅니다.

## 구현 파일

- `agentfeed-frontend/src/components/pages/WorklogReviewPage.tsx`
- `agentfeed-frontend/src/components/pages/FeedPage.tsx`
- `agentfeed-frontend/src/components/pages/SettingsPage.tsx`
- `agentfeed-frontend/src/lib/worklog-review-publish.contract.test.ts`
- `agentfeed-frontend/src/lib/feed-filter-keyboard.contract.test.ts`
- `agentfeed-frontend/src/components/pages/settings-token.contract.test.mjs`
- `agentfeed-frontend/scripts/run-contract-tests.mjs`

## 검증 증거

> [!success] RED → GREEN
> - Review publish RED: `npm run test:contracts` → `review publish must re-fetch the latest review immediately before publishing` 실패.
> - Settings token RED: `node src/components/pages/settings-token.contract.test.mjs` → `one-time token secret must be cleared` 실패.
> - Feed filter RED: focused contract → `feed filter trigger must keep a ref so focus can return` 실패.
> - Frontend contract/lint GREEN: `npm run test:contracts && npm run lint` → passed.
> - Production build GREEN: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` → compiled/static generation passed.

## 남은 검증

- [x] Cross-repo `agentfeed-dev/scripts/test-all.sh` → CLI 296 passed, Frontend CI/build passed, Backend 275 passed, Alembic offline chain passed
- [ ] Remote GitHub CI after push

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Privacy Safety#2026-06-02 Frontend stale review and one-time token safety]]
- [[Integration - CLI Backend Frontend#2026-06-02 Frontend review preflight and feed keyboard contract]]
