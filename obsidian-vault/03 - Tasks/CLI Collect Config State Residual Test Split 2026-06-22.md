---
title: CLI Collect Config State Residual Test Split 2026-06-22
aliases:
  - CLI collect config state residual test split
  - Collect config state residual split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 3abdeed
---

# CLI Collect Config State Residual Test Split 2026-06-22

## 요약

이전 [[CLI Collect Config State Test Split 2026-06-22]] 이후 near-ceiling으로 남은 `tests/cli-collect-config-state.test.ts`를 state/cursor behavior suite와 malformed config failure suite로 추가 분리했다. 공통 temp git project, isolated HOME, built CLI runner, JSON output parser는 `tests/cli-collect-config-state-helpers.ts`로 이동했다.

## 코드 커밋

- `3abdeed` — `Split CLI collect config state tests`

## 변경 파일

- `tests/cli-collect-config-state.test.ts`
- `tests/cli-collect-config-failures.test.ts`
- `tests/cli-collect-config-state-helpers.ts`

## 분리 범위

- `tests/cli-collect-config-state.test.ts`: malformed collection cursor warning, malformed saved draft warning, JSON cursor persistence만 유지.
- `tests/cli-collect-config-failures.test.ts`: malformed project config JSON recovery guidance와 invalid config shape fail-fast를 담당.
- `tests/cli-collect-config-state-helpers.ts`: temp project lifecycle, CLI success/failure runner, collect JSON/error parser, record narrowing helper를 공유.

## 검증 증거

- Baseline: `npm test -- --run tests/cli-collect-config-state.test.ts` — 1 file / 5 tests 통과.
- Targeted split suite: `npm test -- --run tests/cli-collect-config-state.test.ts tests/cli-collect-config-failures.test.ts` — 2 files / 5 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 208 files / 848 tests 통과.
- Whitespace: `git diff --check` 및 `git diff --staged --check` — 출력 없음.
- No-excuse scan: changed 3 files에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-collect-config-state.test.ts`: 67 pure LOC.
  - `tests/cli-collect-config-failures.test.ts`: 34 pure LOC.
  - `tests/cli-collect-config-state-helpers.ts`: 142 pure LOC.
- LSP diagnostics: changed 3 files 모두 `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 후보

현재 200 pure LOC 이상 상위 후보:

```text
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
- [[CLI Collect Config State Test Split 2026-06-22]]
