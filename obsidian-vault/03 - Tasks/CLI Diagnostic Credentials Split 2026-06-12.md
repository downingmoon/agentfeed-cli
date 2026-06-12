---
title: CLI Diagnostic Credentials Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Diagnostic Credentials Split 2026-06-12

> [!success] 완료
> `agentfeed status` / `agentfeed doctor`가 invalid `AGENTFEED_API_BASE_URL` 상태에서도 credential source와 recovery guidance를 잃지 않도록 진단용 credential 복구 경계를 `src/cli/diagnostic-credentials.ts`로 분리했다. 사용자-facing 출력 계약은 유지하고, helper 단위 계약과 실제 CLI JSON smoke로 고정했다.

## 변경 범위

- `src/cli/diagnostic-credentials.ts`
  - `invalidApiBaseUrlMessage`로 invalid API base URL 예외만 선별.
  - `loadDiagnosticCredentialsWithMetadata`로 정상 credential metadata passthrough와 invalid API URL 복구 metadata 생성을 전담.
  - invalid API URL 상태에서도 `AGENTFEED_TOKEN` 기반 environment credential source/store 및 credentials file 존재 여부를 보존.
- `src/cli/index.ts`
  - status/doctor/open에서 쓰던 invalid API URL helper를 import로 대체.
  - inline diagnostic credential 복구 로직 제거.
- `tests/diagnostic-credentials.test.ts`
  - 정상 passthrough, invalid URL + environment token, invalid URL + missing token, non-invalid error rethrow, error message 선별 계약을 고정.

## 검증

- Red: `npm test -- --run tests/diagnostic-credentials.test.ts`가 구현 전 `Cannot find module '../src/cli/diagnostic-credentials.js'`로 실패.
- Unit: `npm test -- --run tests/diagnostic-credentials.test.ts` → 1 file / 5 tests 통과.
- Build: `npm run build` 통과.
- Typecheck: `npm run typecheck` 통과.
- Focused regression: `npm test -- --run tests/diagnostic-credentials.test.ts tests/cli-status-doctor.test.ts tests/cli-status-config-error.test.ts tests/cli-doctor-config-error.test.ts tests/cli-drafts.test.ts tests/open-command.test.ts` → 6 files / 70 tests 통과.
- Full regression: `npm test -- --run` → 96 files / 779 tests 통과.
- CLI smoke: temp git project + isolated HOME + invalid `AGENTFEED_API_BASE_URL=not a url` + env token에서 `status --json` / `doctor --json` 실행.
  - `status --json`: `api.invalid=true`, token source `environment`, next actions `unset AGENTFEED_API_BASE_URL`, `AGENTFEED_ALLOW_INSECURE_API=1 agentfeed status`, `agentfeed doctor` 확인.
  - `doctor --json`: API ready `skipped (invalid API base URL)`, credential source `environment (AGENTFEED_TOKEN)`, invalid API recovery next actions 확인.
- Static: `git diff --check`, OMO TypeScript no-excuse checker 통과.
- LOC: `src/cli/index.ts` 1144 → 1102 pure LOC, `src/cli/diagnostic-credentials.ts` 74 pure LOC.
- LSP: `typescript-language-server` 미설치 상태라 MCP LSP diagnostics는 실행 불가.

## 효과

- CLI status/doctor의 diagnostic credential recovery가 command entrypoint에서 분리되어 CLI operator 상태 출력 계약 drift 위험을 줄였다.
- invalid API base URL 상태에서도 계정/token provenance가 유지되어 operator가 API 설정 문제와 인증 상태를 분리해서 판단할 수 있다.
- 신규 기능, 서버, infra, CI/CD, 개인서버 배포 작업은 수행하지 않았다.

## 후속

> [!todo]
> `src/cli/index.ts`는 여전히 250 pure LOC 초과 inherited defect다. 다음 safe slice는 token stdin/login recovery 또는 doctor account/API checks assembly처럼 observable CLI 계약을 red test로 고정할 수 있는 부분만 분리한다.
