---
title: CLI Config Test Split 2026-06-22
aliases:
  - CLI config split
  - CLI config credential split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 0534d82
---

# CLI Config Test Split 2026-06-22

## 요약

CLI oversized `tests/config.test.ts`를 project config 전용 suite로 줄이고 credential storage, keychain storage, API base URL, credential resolution coverage를 focused suites로 분리했다. 원본과 신규 suites 모두 250 pure LOC ceiling 아래에 있다.

## 코드 커밋

- `0534d82` — `Split CLI config tests`

## 변경 파일

- `tests/config.test.ts`
- `tests/config-credential-storage.test.ts`
- `tests/config-keychain-storage.test.ts`
- `tests/config-api-base.test.ts`
- `tests/config-credential-resolution.test.ts`

## 분리 범위

- `tests/config.test.ts`
  - Project init/reinit/force backup.
  - Malformed project config shape validation.
- `tests/config-credential-storage.test.ts`
  - Env override for configured credentials.
  - Ephemeral credentials, file permissions, avatar metadata, file credential deletion.
  - Atomic JSON writes and safe home resolution.
- `tests/config-keychain-storage.test.ts`
  - Injected keychain deletion and storage.
  - Native macOS/Windows smoke tests gated by platform/env opt-in.
  - Auto/keychain-only fallback refusal and explicit insecure fallback behavior.
- `tests/config-api-base.test.ts`
  - Dev `.env` discovery.
  - Repo-local API base trust boundaries.
  - URL normalization and insecure cleartext opt-in.
- `tests/config-credential-resolution.test.ts`
  - Malformed/invalid stored credential guards.
  - Environment token precedence and API-base provenance warnings.
  - Missing token remediation and metadata token non-leak.

## 검증 증거

- Baseline: `npm test -- --run tests/config.test.ts` — 1 file / 37 tests 통과.
- Targeted split suite: `npm test -- --run tests/config.test.ts tests/config-credential-storage.test.ts tests/config-keychain-storage.test.ts tests/config-api-base.test.ts tests/config-credential-resolution.test.ts` — 5 files / 37 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 183 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: 신규 config suites에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/config.test.ts`: 119 pure LOC.
  - `tests/config-credential-storage.test.ts`: 111 pure LOC.
  - `tests/config-keychain-storage.test.ts`: 221 pure LOC.
  - `tests/config-api-base.test.ts`: 111 pure LOC.
  - `tests/config-credential-resolution.test.ts`: 196 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/config.test.ts` oversized는 해소됨.
- 현재 CLI 테스트 oversized scan 기준 다음 최대 후보는 `tests/cli-help.test.ts` 479 pure LOC이고, 그 다음은 `tests/cli-preview.test.ts` 464 pure LOC다.

## 범위 제한

- 신규 앱 기능 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
