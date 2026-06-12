---
title: CLI Status Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Status Output Split 2026-06-12

> [!success] 완료
> `agentfeed status`의 JSON payload 및 human-readable output 조립을 `src/cli/status-output.ts`로 분리했다. API/credential/cursor label formatter는 `src/cli/diagnostic-formatters.ts`로 분리해 `status`와 `doctor`가 같은 provenance label을 공유하게 했다.

## 변경 범위

- `src/cli/status-output.ts`
  - `statusJsonPayload` 추가.
  - `renderStatusHumanLines` 추가.
  - readiness, setup progress, account/API/project/collection/next sections 출력 계약을 helper 내부로 이동.
- `src/cli/diagnostic-formatters.ts`
  - credential source/store label, API base source label, token expiry label/warning, collection cursor label, warning line, readiness marker를 공용 formatter로 분리.
- `src/cli/index.ts`
  - `cmdStatus`는 상태 수집과 command orchestration만 유지.
  - `doctor`, credential 출력에서 쓰는 공용 formatter import로 중복 label 책임 제거.
- `tests/status-output.test.ts`
  - status JSON label/cursor contract 고정.
  - status human section/warning/next command contract 고정.

## 검증

- Red test: `npx vitest run tests/status-output.test.ts --reporter=verbose`가 구현 전 `Cannot find module '../src/cli/status-output.js'`로 실패함을 확인.
- Build: `npm run build` 통과.
- Focused tests: `npx vitest run tests/status-output.test.ts tests/cli-status-doctor.test.ts tests/cli-status-config-error.test.ts tests/cli-doctor-config-error.test.ts --reporter=verbose` → 4 files / 43 tests 통과.
- Full regression: `npm test -- --run` → 85 files / 734 tests 통과.
- CLI smoke: temp project에서 dist CLI `agentfeed status` 및 `agentfeed status --json` 실행. Human output의 `AgentFeed status`, `Setup progress`, project name, next section 확인. JSON은 parse 후 project name/readiness/next_actions 확인.
- Static checks: `git diff --check`, strict banned-pattern grep, OMO TypeScript no-excuse checker 통과.
- LSP: `typescript-language-server` 미설치 및 이전 decline 상태로 MCP LSP diagnostics 실행 불가.

## 효과

- `src/cli/index.ts` pure LOC: 1703 → 1580.
- status 출력 계약이 command orchestration에서 분리되어, CLI 상태 진단의 JSON/human output 변경이 수집 로직과 섞이지 않는다.
- `status`와 `doctor`가 credential/API/cursor label formatter를 공유해 provenance wording drift 가능성을 낮췄다.

## 제한

- 서버/infra/CICD/deploy 작업 없음.
- 신규 기능 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 개인 서버 배포 없음.
