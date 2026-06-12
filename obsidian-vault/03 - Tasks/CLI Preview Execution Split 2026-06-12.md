---
title: CLI Preview Execution Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Preview Execution Split 2026-06-12

> [!success] 완료
> `agentfeed preview`의 local draft sanitize/persist와 remote compatibility preflight/preview execution을 `src/cli/preview-execution.ts`로 분리했다. JSON/human rendering은 기존 `preview-command` helper에 유지하고 CLI entrypoint는 draft id resolution, execution 호출, 출력 선택만 담당하도록 축소했다.

## 변경 범위

- `src/cli/preview-execution.ts`
  - `runPreviewCommand`로 local/remote preview execution을 분리했다.
  - local preview 전 public fields를 sanitize하고 local draft에 저장하는 기존 동작을 유지했다.
  - remote preview는 sanitize된 draft로 API compatibility preflight 후 `/ingest/worklogs/preview`를 호출한다.
- `src/cli/index.ts`
  - inline preview execution 로직을 제거하고 `runPreviewCommand` 결과를 기존 preview output helper에 전달한다.
- `tests/preview-execution.test.ts`
  - local preview sanitize/persist, remote token requirement, remote preflight + sanitized payload 계약을 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npm test -- --run tests/preview-execution.test.ts` → helper 모듈 부재로 실패.
- Green/focused:
  - `npm test -- --run tests/preview-execution.test.ts tests/cli-preview.test.ts tests/preview-command.test.ts` → 3 files / 20 tests passed.
  - `npm run build`
  - `npm run typecheck`
  - `npm test -- --run tests/preview-execution.test.ts tests/cli-preview.test.ts tests/preview-command.test.ts tests/cli-share.test.ts tests/cli-scan.test.ts` → 5 files / 81 tests passed.
- Full suite: `npm test -- --run` → 101 files / 801 tests passed.
- 실제 CLI smoke:
  - temp git project + isolated HOME에서 `agentfeed preview --id <draft>` 실행 후 secret이 `[REDACTED_SECRET]`로 출력/저장되고 원문 secret이 노출되지 않음을 확인했다.
  - local fake AgentFeed API에서 `agentfeed preview --id <draft> --remote --json` 실행 후 metadata preflight 1회, remote preview 1회, sanitized payload 전송, JSON output shape를 확인했다.
- 정적 검증:
  - `git diff --check`
  - no-excuse TypeScript checker: no violations in `src/cli/preview-execution.ts`, `tests/preview-execution.test.ts`.
  - pure LOC: `src/cli/index.ts` 985 → 982, `src/cli/preview-execution.ts` 34, `tests/preview-execution.test.ts` 122.
- LSP: `typescript-language-server` 미설치로 MCP LSP diagnostics 실행 불가.

## 배포/인프라

- 서버 배포, 개인서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 새 기능 추가 없음. 기존 `agentfeed preview` execution ownership만 분리했다.

## 다음 후보

- `src/cli/index.ts`가 아직 982 pure LOC이므로 다음 safe slice에서 command orchestration 경계를 계속 줄인다.
- 후보: publish command execution 분리 또는 doctor account/API checks assembly 분리.
