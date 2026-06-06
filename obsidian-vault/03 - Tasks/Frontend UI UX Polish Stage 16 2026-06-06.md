---
title: Frontend UI UX Polish Stage 16 2026-06-06
date: 2026-06-06
tags:
  - agentfeed/frontend
  - agentfeed/ui-ux
  - agentfeed/evidence
status: completed
stage: 16
---

# Frontend UI UX Polish Stage 16 2026-06-06

## Scope

CLI browser approval 화면(`/cli/authorize`)의 loading, login, ready, approved, error 상태를 상용화 품질에 맞게 다듬었다. CLI auth security contract, OAuth redirect/session storage behavior, one-time code approval logic은 변경하지 않았다.

Related: [[Active Tasks]]

## Changes

- CLI authorize 화면을 `cli-authorize-shell` + `cli-authorize-card` 구조로 정리했다.
- Main landmark에 loading `aria-busy`를 추가했다.
- Loading 상태를 loose text에서 skeleton status panel로 교체했다.
- Session/account metadata를 reusable `cli-authorize-detail-card`로 정리했다.
- Needs-login 상태에 GitHub login callout을 추가했다.
- Ready 상태에 승인 전 trust notes를 추가했다.
  - 브라우저 URL에 ingestion token이 노출되지 않음.
  - CLI session은 짧은 시간 안에 만료됨.
- Approved 상태를 `role="status"` + `aria-live="polite"` + `aria-atomic="true"` 패널로 교체했다.
- Error 상태를 `role="alert"` 패널로 교체했다.
- 모바일에서 approval card와 CTA가 안정적으로 full-width로 접히도록 CSS를 보강했다.

## Verification

> [!success] Passed
> - `npm test`
> - `npm run lint`
> - `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build`
> - `git diff --check`
> - Local route smoke: `/cli/authorize` returned HTML/body/Next app shell and no raw `undefined is not an object` crash text.

## Cleanup evidence

- Temporary `/tmp/agentfeed-cli-authorize-stage16.html` was removed.
- Temporary Next dev server on port `3111` was stopped.
- Final `ps` check found no `localhost:3111`, `next dev`, Playwright MCP, `chrome-headless-shell`, or `ms-playwright` residual process after cleanup.

## Remaining visual QA

- Full GitHub OAuth browser login approval with a live CLI session remains a final success-state QA candidate.
- Final cross-page visual sweep remains the next best completion-audit step.
