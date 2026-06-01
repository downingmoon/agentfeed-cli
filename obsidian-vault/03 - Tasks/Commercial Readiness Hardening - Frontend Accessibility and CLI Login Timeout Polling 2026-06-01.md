---
title: Frontend Accessibility and CLI Login Timeout Polling
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/accessibility
  - agentfeed/cli
  - agentfeed/auth
  - agentfeed/commercial-readiness
status: done
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
---

# Frontend Accessibility and CLI Login Timeout Polling

> [!success]
> Public discovery 화면의 mouse-first navigation을 keyboard-visible path로 보강했고, 통합 테스트에서 드러난 CLI browser-login timeout polling 경계값도 deterministic하게 고정했습니다.

## 배경

상용화 관점에서 `/feed`와 worklog card는 신규 사용자가 가장 먼저 만지는 discovery surface입니다. 기존 구현에는 다음 위험이 있었습니다.

- Worklog card `<article>` click handler가 keyboard focus/activation 없이 mouse-first로 동작했습니다.
- Feed sidebar trending item이 `href` 없는 anchor + `onClick` navigation 형태였습니다.
- like/bookmark/icon-only action에 accessible name이 부족했습니다.
- global focus reset 뒤 keyboard focus ring이 충분히 보이지 않았습니다.
- cross-repo `make test` 중 CLI browser-login polling sleep test가 real timer jitter에 민감해 `[19, 1]` 같은 추가 sleep으로 release preflight를 막았습니다.

참고한 최신 UI 품질 기준: [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)

## 변경 사항

### Frontend discovery accessibility

- `WorklogCardA/B/C`의 clickable card를 `role="link"`, `tabIndex={0}`, `aria-label` 포함 keyboard-focusable surface로 변경했습니다.
- 공통 helper `openWorklogOnCardKeyDown()`을 추가해 `Enter`/`Space` activation을 지원하면서 nested action button key event는 가로채지 않게 했습니다.
- like/bookmark icon buttons에 `Like/Unlike`, `Bookmark/Remove bookmark` accessible label을 부여했습니다.
- Feed card variant와 hot category segmented controls에 `aria-pressed`를 추가했습니다.
- active tag clear button에 filter 대상이 포함된 `aria-label`을 추가했습니다.
- sidebar trending worklog는 Next.js `Link` + `href` 기반 semantic navigation으로 전환했습니다.
- rising builder pseudo-button은 profile open label과 `Space` scroll 방지 keyboard handler를 갖도록 보강했습니다.
- global `:focus-visible` ring을 anchor/button/role widgets/input 계열에 추가하고 `.input:focus-visible`로 outline reset을 보정했습니다.

### CLI login timeout polling

- `waitForCliAuthExchange()`가 remaining timeout 전체를 sleep한 뒤 deadline 전 1ms jitter로 한 번 더 polling/sleep하지 않도록 `sleepMs >= remainingMs`이면 timeout path로 빠지게 했습니다.
- 기존 real timer 기반 test를 `Date.now()` sequence 기반 deterministic regression test로 바꿔 release preflight flake를 재현/고정했습니다.

## 검증 증거

> [!example] Frontend
> - `npm run test:contracts` in `agentfeed-frontend` → passed
> - `npm run lint` in `agentfeed-frontend` → passed
> - `git diff --check` in `agentfeed-frontend` → passed
> - `npm run ci` in `agentfeed-frontend` → passed

> [!example] CLI
> - `npm test -- --run tests/api-hook.test.ts -t "caps browser login polling sleep"` in `AgentFeed-CLI` → failed before production fix as expected
> - `npm test -- --run tests/api-hook.test.ts -t "caps browser login polling sleep"` in `AgentFeed-CLI` → passed after fix
> - `npm run release:preflight` in `AgentFeed-CLI` → passed

> [!example] Cross-repo
> - `make test` in `agentfeed-dev` → passed
> - OpenAPI operations checked: 69
> - Client contracts checked: 66 (`cli`: 6, `frontend`: 60)
> - Backend pytest: 226 passed, 1 warning
> - Alembic offline migration chain generated successfully

## 남은 리스크

> [!warning]
> 실제 VoiceOver/NVDA screen-reader session과 keyboard-only browser walkthrough는 아직 수동으로 확인하지 않았습니다. 다음 visual/accessibility QA slice에서 `/feed`, `/worklogs/{id}`, `/profile/{username}`를 real browser로 tab-order 확인하면 좋습니다.

## 관련 링크

- [[Integration - CLI Backend Frontend]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Frontend Interaction Pending Guards 2026-06-01]]
- [[Commercial Readiness Hardening - CLI Upload Timeout Reconciliation 2026-06-01]]
