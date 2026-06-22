---
title: CLI Keychain Storage Test Split 2026-06-22
aliases:
  - CLI keychain storage test split
  - Keychain storage test split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 1cb8586
---

# CLI Keychain Storage Test Split 2026-06-22

## 요약

CLI near-ceiling `tests/config-keychain-storage.test.ts`를 keychain storage/native smoke suite와 fallback policy suite로 분리했다. 공통 env isolation, temp HOME/project directory, fake keychain stores는 `tests/config-keychain-storage-helpers.ts`로 이동했다.

## 코드 커밋

- `1cb8586` — `Split CLI keychain storage tests`

## 변경 파일

- `tests/config-keychain-storage.test.ts`
- `tests/config-keychain-fallback.test.ts`
- `tests/config-keychain-storage-helpers.ts`

## 분리 범위

- `tests/config-keychain-storage.test.ts`: injected keychain delete/store leakage contracts와 native macOS/Windows smoke tests를 유지.
- `tests/config-keychain-fallback.test.ts`: auto/keychain fallback refusal, explicit insecure file fallback, write failure fail-fast policy를 담당.
- `tests/config-keychain-storage-helpers.ts`: env snapshot/restore, temp dir cleanup, mutable/unavailable/failing keychain stores를 공유.

## 검증 증거

- Baseline: `npm test -- --run tests/config-keychain-storage.test.ts` — 1 file / 8 tests 통과.
- Targeted split suite: `npm test -- --run tests/config-keychain-storage.test.ts tests/config-keychain-fallback.test.ts` — 2 files / 8 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 209 files / 848 tests 통과.
- Whitespace: `git diff --check` 및 `git diff --staged --check` — 출력 없음.
- No-excuse scan: changed 3 files에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/config-keychain-storage.test.ts`: 102 pure LOC.
  - `tests/config-keychain-fallback.test.ts`: 55 pure LOC.
  - `tests/config-keychain-storage-helpers.ts`: 106 pure LOC.
- LSP diagnostics: changed 3 files 모두 `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 후보

현재 200 pure LOC 이상 상위 후보:

```text
214 tests/git-draft-configured-commands.test.ts
212 tests/session-collector-generic-metadata.test.ts
211 tests/cli-share-json-handoff.test.ts
210 tests/keychain-env.test.ts
205 tests/cli-collect-json-auth.test.ts
204 tests/cli-upload-confirmation.test.ts
204 tests/cli-api-health-checks.test.ts
203 tests/share-upload-execution.test.ts
203 tests/cli-cached-upload-reuse-contract.test.ts
202 tests/cli-status-doctor.test.ts
202 tests/cli-rotate-browser-replacement.test.ts
201 tests/cli-collect-command-ux.test.ts
200 tests/release-preflight.test.ts
```

## 범위 제한

- 신규 앱 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
