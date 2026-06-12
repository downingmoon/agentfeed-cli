---
title: CLI Auth Token Input Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Auth Token Input Split 2026-06-12

> [!success] 완료
> `agentfeed login`의 token input method 판정과 보안 recovery 문구를 `src/cli/auth-token-input.ts`로 분리했다. literal argv token 차단, stdin token trim/empty 처리, `login --json` token-required recovery 계약은 사용자-facing 동작 변경 없이 테스트와 실제 CLI smoke로 고정했다.

## 변경 범위

- `src/cli/auth-token-input.ts`
  - `SAFE_TOKEN_STDIN_COMMAND`, `emptyTokenStdinMessage`, `unsafeArgvTokenMessage`, `missingTokenMessage`, `jsonTokenRequiredMessage`를 단일 소유자로 이동.
  - `resolveLoginTokenInput`으로 `--token-stdin`, `--token -`, unsafe argv token escape hatch, JSON machine-readable token requirement를 판정.
- `src/cli/index.ts`
  - `cmdLogin`의 token input branching을 helper 호출로 대체.
  - upload/preview/collect/publish에서 쓰는 missing token recovery도 helper import로 공유.
- `tests/auth-token-input.test.ts`
  - stdin token trim, input method conflict, unsafe argv refusal/escape hatch, empty stdin, JSON token-required, shared remediation command 계약을 고정.

## 검증

- Red: `npm test -- --run tests/auth-token-input.test.ts`가 구현 전 `Cannot find module '../src/cli/auth-token-input.js'`로 실패.
- Unit: `npm test -- --run tests/auth-token-input.test.ts` → 1 file / 7 tests 통과.
- Build: `npm run build` 통과.
- Typecheck: `npm run typecheck` 통과.
- Focused regression: `npm test -- --run tests/auth-token-input.test.ts tests/cli-status-doctor.test.ts tests/auth-output.test.ts tests/cli-help.test.ts tests/cli-collect.test.ts tests/cli-share.test.ts tests/cli-preview.test.ts tests/config.test.ts` → 8 files / 210 tests 통과.
- Full regression: `npm test -- --run` → 97 files / 786 tests 통과.
- CLI smoke: isolated HOME에서 실제 dist CLI 실행.
  - `agentfeed login --json` token 누락 시 JSON error와 token-stdin next actions 확인.
  - `agentfeed login --token-stdin` 빈 stdin 시 human stderr recovery 확인.
  - `agentfeed login --token <token>` 기본 차단 및 secret 미노출 확인.
- Static: `git diff --check`, OMO TypeScript no-excuse checker 통과.
- LOC: `src/cli/index.ts` 1102 → 1073 pure LOC, `src/cli/auth-token-input.ts` 55 pure LOC.
- LSP: `typescript-language-server` 미설치 상태라 MCP LSP diagnostics는 실행 불가.

## 효과

- CLI 인증 token 입력 보안 정책이 command orchestration에서 분리되어 token leak 방지와 machine-readable JSON recovery 계약 drift 위험을 줄였다.
- token 누락/빈 stdin/unsafe argv 같은 operator-facing failure mode가 focused helper tests로 빠르게 검증된다.
- 신규 기능, 서버, infra, CI/CD, 개인서버 배포 작업은 수행하지 않았다.

## 후속

> [!todo]
> `src/cli/index.ts`는 여전히 250 pure LOC 초과 inherited defect다. 다음 safe slice는 CI/browser-login recovery 또는 rotate token replacement orchestration처럼 observable CLI 계약을 red test로 고정할 수 있는 부분만 분리한다.
