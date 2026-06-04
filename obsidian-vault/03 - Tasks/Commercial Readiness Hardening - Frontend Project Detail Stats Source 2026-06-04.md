---
title: Commercial Readiness Hardening - Frontend Project Detail Stats Source 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/contracts
  - hardening
status: completed
created: 2026-06-04
aliases:
  - Frontend project detail stats source
---

# Commercial Readiness Hardening - Frontend Project Detail Stats Source 2026-06-04

## 목적

`ProjectDetailPage`의 stats strip에서 `project.stats.worklogs || worklogs.length` fallback을 사용하고 있었다. 이 fallback은 backend가 제공한 authoritative project stats가 `0`이거나 partial payload로 정규화된 상태일 때, 현재 화면에 로드된 worklog page 길이로 값을 대체할 수 있다.

> [!warning]
> 프로젝트 통계는 backend aggregate contract가 단일 소스여야 한다. 페이지에 로드된 worklog 개수는 cursor/page size와 필터 상태에 좌우되므로 상용 UI에서 실제 프로젝트 통계처럼 표시하면 신뢰도가 깨진다.

## 변경 요약

- `agentfeed-frontend/src/components/pages/ProjectDetailPage.tsx`
  - Worklogs stats 표시를 `fmtNumber(project.stats.worklogs)`로 변경했다.
  - Commits도 동일한 표시 helper를 사용해 null/unknown 표시 정책을 통일했다.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - `project.stats.worklogs || worklogs.length` 패턴을 금지했다.
  - project detail stats strip이 backend project stats를 단일 소스로 렌더링하는지 contract로 고정했다.

## 검증

> [!success] Fresh local verification
> - `npm run test:contracts` ✅
> - `npm run lint` ✅
> - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` ✅

## 병렬 스캔에서 남은 후보

- CLI: release trigger/tag guard, publish/share lock diagnostics, CI/automation auth source diagnostics.
- Backend: ingest quota concurrency, feed aggregate cursor stability, client compatibility enforcement.
- Frontend: hosted readiness gate hardening, API compatibility auth recovery UX.

## 남은 외부 차단 조건

- hosted full E2E는 여전히 `api.agentfeed.dev` DNS와 `agentfeed.dev` stale redirect가 해결되어야 검증 가능하다.

## 관련 노트

- [[Commercial Readiness Hardening - Frontend Partial Stats Normalization 2026-06-04]]
- [[Commercial Readiness Hardening - Backend Project Owner Stats Aggregation 2026-06-04]]
- [[Commercial Readiness Hardening - Backend Public Stats Scalability 2026-06-04]]
- [[Active Tasks]]
