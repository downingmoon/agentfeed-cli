---
title: Frontend Dashboard Action URL Dot Segment Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/navigation
  - agentfeed/security
  - agentfeed/enterprise-readiness
status: done
aliases:
  - Dashboard action URL dot-segment guard
---

# Frontend Dashboard Action URL Dot Segment Guard 2026-06-10

> [!success]
> Dashboard recent worklog 링크 helper가 backend `action_url`에 포함된 raw/encoded dot-segment를 보존하지 않고, worklog 상태 기반의 안전한 fallback 경로로 되돌리도록 보강했다.

## 배경

[[Active Tasks]]의 contract/error-boundary pass에서 Frontend dashboard navigation helper를 재점검했다. `src/lib/dashboard-actions.ts`는 `action_url`이 `/worklogs/` prefix이고 외부 URL이 아니면 그대로 보존했다.

문제 예시:

```text
/worklogs/../review
/worklogs/%2e%2e
```

이런 경로는 문자열 상으로는 `/worklogs/` prefix를 갖지만, 브라우저 URL 정규화 과정에서 의도한 worklog detail/review path를 벗어날 수 있다. Backend API parser가 strict하더라도 UI helper 자체도 defensive하게 fail-closed 해야 한다.

## 변경

- Frontend commit `55b7643 Reject dashboard action dot segments`
- `src/lib/dashboard-actions.ts`
  - backend-provided `action_url`의 worklog segment가 raw `.`/`..`이면 거부.
  - percent-decoded segment가 `.`/`..`이어도 거부.
  - 거부 시 기존 상태 기반 fallback 유지:
    - `public`/`unlisted` → public detail
    - 그 외 → review path
- `src/lib/dashboard-actions.contract.test.ts`
  - raw dot-segment action URL이 fallback review URL로 바뀌는지 검증.
  - encoded dot-segment action URL이 fallback public detail URL로 바뀌는지 검증.
- `scripts/run-contract-tests.mjs`
  - 새 dashboard action contract를 전체 contract suite에 포함.

## Contract rule

```text
Dashboard action URLs may preserve backend-provided paths only when the worklog path segment is a concrete route segment. Raw or encoded dot segments must be rejected before applying review_base_url.
```

> [!warning] 유지 규칙
> Prefix check만으로 `/worklogs/*`를 신뢰하면 브라우저 path normalization edge case를 놓칠 수 있다. Dashboard navigation helper는 API normalizer와 별개로 안전한 fallback route를 유지해야 한다.

## Verification evidence

- Red 확인:
  - `npm run test:contracts` → `dashboard recent worklog action URLs must reject dot-segment backend paths and fall back by status`
- Frontend green:
  - `npm run test:contracts` → pass
  - `npm run lint` → pass
  - `NEXT_PUBLIC_API_URL=https://api.example.com npm run build` → pass
- LOC check:
  - `src/lib/dashboard-actions.ts` → 33 pure LOC
  - `src/lib/dashboard-actions.contract.test.ts` → 21 pure LOC
  - `scripts/run-contract-tests.mjs` → 79 pure LOC
- Not tested:
  - LSP diagnostics: local `typescript-language-server` is not installed.

## Follow-up

- [ ] Backend `requireDashboardActionUrl`에도 dot-segment raw/encoded 거부 contract가 필요한지 별도 pass에서 확인한다. 현재 Frontend UI helper는 fail-closed 되었지만, API boundary 자체의 방어도 중복으로 점검할 가치가 있다.

## Related

- [[Frontend Worklog Prompt Copy Error Detail 2026-06-10]]
- [[Frontend API JSON Boundary Guard 2026-06-10]]
- [[Frontend Worklog Author Profile Route Guard 2026-06-10]]
