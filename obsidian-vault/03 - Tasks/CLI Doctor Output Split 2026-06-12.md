---
title: CLI Doctor Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Doctor Output Split 2026-06-12

> [!success] 완료
> `agentfeed doctor`의 JSON payload와 human-readable diagnostics rendering을 `src/cli/doctor-output.ts`로 분리했다. API reachability, credential/project/collection 진단 수집은 `cmdDoctor`에 남기고 출력 조립 및 row 변환만 helper로 이동했다.

## 변경 범위

- `src/cli/doctor-output.ts`
  - `doctorJsonPayload`로 summary, readiness, priority actions, runtime/account/API/project/collection rows, warnings, agent signals, next actions JSON shape를 집중화했다.
  - `renderDoctorHumanLines`로 heading, summary, check sections, warnings, agent signals, guided next action rendering을 집중화했다.
  - `doctorCheckRows`로 tuple 기반 check 입력을 automation-safe JSON row로 변환한다.
- `src/cli/index.ts`
  - `cmdDoctor`은 diagnostics 수집, API check, readiness input construction만 유지하고 출력 조립을 helper에 위임한다.
- `tests/doctor-output.test.ts`
  - doctor JSON payload, human output, check row conversion을 순수 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npx vitest run tests/doctor-output.test.ts --reporter=verbose` → helper 모듈 부재로 실패.
- Green/focused:
  - `npm run build`
  - `npx vitest run tests/doctor-output.test.ts tests/cli-status-doctor.test.ts tests/cli-doctor-config-error.test.ts tests/api-non-json-error-diagnostics.test.ts tests/cli-guidance-actions.test.ts --reporter=verbose` → 5 files / 48 tests passed.
- Full suite: `npm test -- --run` → 91 files / 752 tests passed.
- 실제 CLI smoke:
  - temp project `agentfeed doctor` human output에서 AgentFeed doctor, Summary, Runtime, Account, API, Project, Collection, Agent signals, Next, Recommended order, API failure, project config valid 표시를 확인했다.
  - temp project `agentfeed doctor --json` JSON에서 summary/readiness/priority_actions/runtime/account/api/project/collection/warnings/agent_signal_summary/agent_signals/next_actions shape를 확인했다.
  - smoke 출력에서 secret leakage 없음 확인.
- 정적 검증:
  - `git diff --check`
  - pure LOC: `src/cli/index.ts` 1336, `src/cli/doctor-output.ts` 142, `tests/doctor-output.test.ts` 78.
  - strict grep: no `any`, `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion pattern in new helper/test.
  - no-excuse TypeScript checker: no violations in changed TS files.
- LSP: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 배포/인프라

- 서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음. 기존 doctor public behavior 유지.

## 다음 후보

- `src/cli/index.ts`가 여전히 oversized(1336 pure LOC)이므로 다음 slice에서도 command-specific orchestration/output 경계를 추가 분리한다.
- 후보: doctor/status diagnostic construction 추가 분리 또는 copy/open review URL helper 경계 정리.
