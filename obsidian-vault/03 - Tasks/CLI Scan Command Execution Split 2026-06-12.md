---
title: CLI Scan Command Execution Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Scan Command Execution Split 2026-06-12

> [!success] 완료
> `agentfeed scan`의 path inspect-only scan, draft dry-run scan, saved draft redaction/write execution을 `src/cli/scan-command.ts`로 분리했다. JSON/human rendering은 기존 `privacy-scan-output` helper에 유지하고 CLI entrypoint는 option parsing과 출력 선택만 담당하도록 축소했다.

## 변경 범위

- `src/cli/scan-command.ts`
  - `runPrivacyScanCommand`로 path scan과 draft scan execution을 분리했다.
  - path scan은 기존처럼 `collectGitMetrics` + `changedAreas` 입력을 scan하고 draft를 수정하지 않는다.
  - draft dry-run은 redaction 결과만 반환하고 저장 draft를 변경하지 않는다.
  - saved draft scan은 redacted public fields와 `privacy_scan` status를 local draft에 저장한다.
- `src/cli/index.ts`
  - inline `cmdScan` execution 로직을 제거하고 `runPrivacyScanCommand` 결과를 기존 output helper에 전달한다.
- `tests/scan-command.test.ts`
  - path inspect-only, draft dry-run read-only, saved draft redaction/write 계약을 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npm test -- --run tests/scan-command.test.ts` → helper 모듈 부재로 실패.
- Green/focused:
  - `npm run build`
  - `npm test -- --run tests/scan-command.test.ts tests/cli-scan.test.ts tests/privacy-scan-output.test.ts` → 3 files / 12 tests passed.
  - `npm run typecheck`
  - `npm test -- --run tests/scan-command.test.ts tests/cli-scan.test.ts tests/privacy-scan-output.test.ts tests/cli-preview.test.ts tests/cli-share.test.ts` → 5 files / 79 tests passed.
- Full suite: `npm test -- --run` → 100 files / 798 tests passed.
- 실제 CLI smoke:
  - temp git project + isolated HOME에서 `agentfeed scan --id <draft> --dry-run` 실행 후 secret redaction preview가 나오고 saved draft는 원문/`safe` scan 상태를 유지함을 확인했다.
  - `agentfeed scan --id <draft> --json` 실행 후 saved draft summary가 `[REDACTED_SECRET]`로 저장되고 `privacy_scan.status`가 `danger`가 됨을 확인했다.
  - `agentfeed scan --path <project> --json` 실행 후 `mode: inspect_only`, `saved: false`, path target을 유지함을 확인했다.
- 정적 검증:
  - `git diff --check`
  - no-excuse TypeScript checker: no violations in `src/cli/scan-command.ts`, `tests/scan-command.test.ts`.
  - pure LOC: `src/cli/index.ts` 1005 → 985, `src/cli/scan-command.ts` 47, `tests/scan-command.test.ts` 51.
- LSP: `typescript-language-server` 미설치로 MCP LSP diagnostics 실행 불가.

## 배포/인프라

- 서버 배포, 개인서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 새 기능 추가 없음. 기존 `agentfeed scan` execution ownership만 분리했다.

## 다음 후보

- `src/cli/index.ts`가 아직 985 pure LOC이므로 다음 safe slice에서 command orchestration 경계를 계속 줄인다.
- 후보: preview command execution 분리 또는 doctor account/API checks assembly 분리.
