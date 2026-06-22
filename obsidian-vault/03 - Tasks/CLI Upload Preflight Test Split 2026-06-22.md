---
title: CLI Upload Preflight Test Split 2026-06-22
aliases:
  - CLI upload preflight split
  - Upload preflight ingestion token split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 8ad7e4f
---

# CLI Upload Preflight Test Split 2026-06-22

## 요약

CLI upload preflight recovery 테스트에서 ingestion token recovery coverage를 별도 focused suite로 분리했다. 원본 `tests/upload-preflight.test.ts`는 API compatibility, combined preflight ordering, credential-save compatibility recovery 계약에 집중하고, 신규 `tests/upload-preflight-ingestion-token.test.ts`는 invalid/revoked ingestion token 관련 사용자 복구 안내 계약만 검증한다.

## 코드 커밋

- `8ad7e4f` — `Split CLI upload preflight tests`

## 변경 파일

- `tests/upload-preflight.test.ts`
- `tests/upload-preflight-ingestion-token.test.ts`

## 분리 범위

- `tests/upload-preflight.test.ts`
  - Compatible API metadata return contract.
  - Upload compatibility failure recovery commands.
  - Network/no-status compatibility failure machine-readable doctor guidance.
  - API compatibility check before ingestion token check ordering.
  - Credential-save compatibility failure guidance.
- `tests/upload-preflight-ingestion-token.test.ts`
  - Invalid ingestion token login/rotate/status/retry guidance.
  - Saved-token credential context guidance, including browser login not exporting `AGENTFEED_TOKEN`.
  - Stale `AGENTFEED_TOKEN` env recovery priority.
  - API base env override recovery priority.

## 검증 증거

- Baseline: `npm test -- --run tests/upload-preflight.test.ts` — 1 file / 9 tests 통과.
- Targeted split suite: `npm test -- --run tests/upload-preflight.test.ts tests/upload-preflight-ingestion-token.test.ts` — 2 files / 9 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 198 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: changed upload preflight files에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/upload-preflight.test.ts`: 130 pure LOC.
  - `tests/upload-preflight-ingestion-token.test.ts`: 126 pure LOC.
- LSP diagnostics: changed `.ts` files 모두 `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/upload-preflight.test.ts` oversized는 해소됨.
- 현재 CLI 테스트 >200 pure LOC scan 기준 다음 최대 후보는 `tests/duplicate-draft.test.ts` 243 pure LOC이고, 그 다음은 `tests/cli-collect.test.ts` 242 pure LOC, `tests/cli-publish-review-handoff.test.ts` 236 pure LOC다.

## 범위 제한

- 신규 앱 기능 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
