---
title: Frontend UI UX Polish Stage 18 2026-06-06
date: 2026-06-06
tags:
  - agentfeed/frontend
  - agentfeed/ui-ux
  - agentfeed/evidence
  - agentfeed/server-smoke
status: completed
stage: 18
---

# Frontend UI UX Polish Stage 18 2026-06-06

## Scope

개인 서버 IP-only production stack에서 **authenticated success-state visual smoke**를 완료했다. Stage 17까지의 static/anonymous/cross-page QA 이후 남아 있던 핵심 미검증 영역인 로그인 이후 성공 상태를 실제 서버 배포 환경에서 확인했다.

- Frontend: `http://161.33.171.81:13030`
- API: `http://161.33.171.81:18080/v1`
- Runtime: production frontend container, Next.js `15.5.19`
- Related goal: [[Active Tasks#P2 — 제품 polish backlog]]

## Changes

### Backend contract robustness

Visual smoke 중 publish 이후 public detail이 safe error state로 떨어지는 문제가 확인됐다. 원인은 stored JSONB가 legacy/agent-origin shape일 때 backend response validation이 500을 내는 contract 결함이었다.

- `normalize_outcome()`이 `{title, description}` legacy row를 `{label, value}`로 안전하게 변환한다.
- malformed outcome row는 public detail 500 대신 제외한다.
- `normalize_timeline()`을 추가해 `order`가 없는 `{title, description}` legacy timeline row에 stable order를 부여한다.
- `GET /v1/worklogs/{id}` public detail response가 timeline도 response-model-safe shape로 반환한다.

### Frontend detail metrics polish

대표 스크린샷에서 `Session metrics > Models` 값이 `sonnet-4.6, g...`처럼 truncate되어 멀티모델 evidence가 덜 보였다. 사용자 요구인 “해당 디렉터리에서 작업된 모든 모델들이 보여야 함”에 맞춰 다음을 보강했다.

- Worklog detail metric value 중 Models/Modes/Sources/Window는 wrap 가능하게 변경.
- 모든 metric value에 `title={String(m.value)}`를 부여해 hover/assistive 확인 경로를 유지.
- `page-source-contract.test.ts`에 모델 리스트 wrap 계약을 추가.

## Visual smoke coverage

Stage18 script가 개인 서버 production stack에서 13개 success-state 화면을 screenshot + DOM metric으로 검증했다.

| Flow | Evidence |
| --- | --- |
| CLI OAuth approval | `/cli/authorize` 승인 완료 state |
| Settings token create | one-time token panel + success banner |
| Settings token rotate | rotated secret panel + success banner |
| Settings token revoke | revoked state + list cleanup |
| Profile follow | follow success live feedback |
| Project create | project detail owner state |
| Project edit | update success state |
| Project delete | projects index return |
| Worklog review ready | publish readiness panel |
| Worklog publish | public detail navigation success |
| Mobile settings | authenticated settings state |
| Mobile profile | following state |
| Mobile worklog detail | published detail + metrics wrap |

Final JSON summary:

```json
{
  "frontUrl": "http://161.33.171.81:13030",
  "apiBase": "http://161.33.171.81:18080/v1",
  "pass": true,
  "count": 13,
  "failures": []
}
```

DOM metric gates for every captured page:

- `main >= 1`
- no horizontal overflow
- no crash text
- no `Failed to fetch` / API contract error text

## Verification

- Backend `uv run ruff check app tests`: pass.
- Backend `uv run pytest tests/test_contracts.py -q`: 364 passed, 1 warning.
- Backend `uv run pytest -q`: 392 passed, 1 warning.
- Frontend `npm test`: pass.
- Frontend `npm run lint`: pass.
- Frontend `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build`: pass.
- Server deploy: `make server-up`, then production frontend force recreate and health `healthy`.
- Final server visual smoke: `pass: true`, `count: 13`, `failures: []`.
- Server cleanup: `stage18_users=0`, `stage18_worklogs=0`, `stage18_projects=0`.
- Local process cleanup: no AgentFeed Playwright/Chrome/Next test process remains. Existing `world-homecare-platform` Next dev process is unrelated and was not touched.

## Completion judgement

Stage 18 closes the main evidence gap left after Stage 17: authenticated, success-state, server-deployed visual QA. Together with Stage 1~17, the current Frontend UI/UX polish goal now has direct evidence across anonymous pages, authenticated settings/profile/project/worklog flows, desktop/mobile rendering, contract tests, production build, and personal-server smoke.

Related notes:

- [[Frontend UI UX Polish Stage 17 2026-06-06]]
- [[Active Tasks]]
