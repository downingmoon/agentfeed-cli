---
title: Frontend Select Value Parser Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/commercial-readiness
status: done
---

# Frontend Select Value Parser Guard 2026-06-10

> [!success]
> Frontend select 입력에서 `event.target.value as ...`로 raw DOM string을 API/UI union으로 강제 캐스팅하던 경로를 명시 파서로 교체했다.

## 문제

- `ProjectsPage` project sort select가 `event.target.value as SortKey`를 사용했다.
- `ModerationReportsPage` status filter가 `event.target.value as ApiModerationReportStatus`를 사용했다.
- `WorklogDetailPage` report reason select가 `event.target.value as ApiReportReason`를 사용했다.
- 이 패턴은 DOM 문자열이 바뀌거나 옵션/타입 계약이 어긋나도 타입 시스템이 잡지 못한다.

## 수정

- `src/lib/project-sort-options.ts`
  - `ProjectSortKey`, `PROJECT_SORT_OPTIONS`, `projectSortKeyFromSelect` 추가.
- `src/lib/moderation-report-options.ts`
  - `MODERATION_REPORT_STATUSES`, `moderationReportStatusFromSelect` 추가.
- `src/lib/worklog-report-options.ts`
  - `REPORT_REASONS`, `reportReasonFromSelect` 추가.
- `ProjectsPage`, `ModerationReportsPage`, `WorklogDetailPage`
  - select `onChange`에서 raw string assertion 제거.
  - oversized page에 새 로직을 추가하지 않고 옵션/파서를 lib로 추출.
- `src/lib/select-value-source-contract.test.ts`
  - 페이지 select handler에서 `event.target.value as ...`가 재도입되면 실패.
- `src/lib/select-value-parsers.contract.test.ts`
  - 허용 값은 통과하고 알 수 없는 값은 명시적으로 throw 되는지 검증.

## 검증

- Red 확인
  - 새 source contract 실행 연결 후 기존 `ModerationReportsPage.tsx`의 `event.target.value as ...`에서 실패 확인.
- Green 확인
  - `npm run test:contracts`
  - `npm run lint`
  - `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 NEXT_TELEMETRY_DISABLED=1 npm run ci`
  - `node scripts/check-openapi-contract.mjs`
- Manual QA
  - `next start -p 3101` 로컬 프로덕션 서버 실행.
  - `http://localhost:3101/projects` 접속.
  - `projectSort` select를 `name`으로 변경했고 런타임 오류 없이 value가 `name`으로 유지됨 확인.

## 검증 제약

> [!warning]
> TypeScript LSP diagnostics는 `typescript-language-server`가 설치되어 있지 않아 실행되지 않았다. 대신 `tsc --noEmit` 기반 `npm run lint`와 `npm run ci`로 타입 검증을 수행했다.

## 배포

- 서버 배포는 하지 않았다. 현재 goal 규칙 6을 유지한다.

## 후속 처리

- [x] `src/lib/select-value-parsers.contract.test.ts` assertion orchestration은 [[Frontend Select Value Parser Assertion Move 2026-06-19]]에서 `select-value-parser-assertions.ts`로 이동했다.

## 후속 후보

- `src/lib/adapters.ts`의 `as Worklog & { _author: User }` 반환 경계 제거 여부 검토.
- `src/hooks/useWorklog.ts`의 `_author` 접근 assertion 제거 가능성 검토.
- `src/lib/integration-contract.ts` 테스트 fixture의 `as unknown as Worklog`가 실제로 필요한지 축소 검토.
