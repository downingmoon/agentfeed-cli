---
title: CLI Collect Upload Failure Residual Test Split 2026-06-22
aliases:
  - CLI collect upload failure residual test split
  - Collect upload failure residual split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: f0a2a08
---

# CLI Collect Upload Failure Residual Test Split 2026-06-22

## 요약

이전 [[CLI Collect Upload Failure Test Split 2026-06-22]] 이후 near-ceiling으로 남은 `tests/cli-collect-upload-failures.test.ts`를 preflight failure suite와 cursor preservation failure suite로 추가 분리했다. 동작 변경 없이 shared fixture/server/CLI harness를 `tests/cli-collect-upload-failure-helpers.ts`로 올려 재사용했다.

## 코드 커밋

- `f0a2a08` — `Split CLI collect upload failure tests`

## 변경 파일

- `tests/cli-collect-upload-failures.test.ts`
- `tests/cli-collect-upload-cursor-failures.test.ts`
- `tests/cli-collect-upload-failure-helpers.ts`

## 분리 범위

- `tests/cli-collect-upload-failures.test.ts`: ingestion token preflight invalid token refusal만 유지.
- `tests/cli-collect-upload-cursor-failures.test.ts`: preflight failure와 ingest upload failure 모두 collection cursor를 변경하지 않는 계약을 담당.
- `tests/cli-collect-upload-failure-helpers.ts`: temp git project, isolated HOME, CLI runner, local HTTP server listen/close helpers를 공유 fixture로 통합.

## 검증 증거

- Targeted split suite: `npm test -- --run tests/cli-collect-upload-failures.test.ts tests/cli-collect-upload-cursor-failures.test.ts` — 2 files / 3 tests 통과.
- Typecheck: `npm run typecheck` — 통과.
- Build: `npm run build` — 통과.
- Full CLI suite: `npm test -- --run` — 207 files / 848 tests 통과.
- Whitespace: `git diff --check` 및 `git diff --staged --check` — 출력 없음.
- No-excuse scan: changed 3 files에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-collect-upload-failures.test.ts`: 64 pure LOC.
  - `tests/cli-collect-upload-cursor-failures.test.ts`: 89 pure LOC.
  - `tests/cli-collect-upload-failure-helpers.ts`: 142 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 후보

현재 200 pure LOC 이상 상위 후보:

```text
222 tests/cli-collect-config-state.test.ts
221 tests/config-keychain-storage.test.ts
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
- [[CLI Collect Upload Failure Test Split 2026-06-22]]
