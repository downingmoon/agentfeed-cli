---
title: CLI Share JSON Upload Output Test Split 2026-06-22
aliases:
  - CLI share JSON upload output split
  - Share JSON upload redaction split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 94523cb
---

# CLI Share JSON Upload Output Test Split 2026-06-22

## 요약

CLI reviewability cleanup으로 `tests/cli-share-json-upload-output.test.ts`에서 reused draft secret redaction coverage를 별도 focused suite로 분리했다. 원본 suite는 successful JSON upload output smoke와 `--no-save-cursor` 계약에 집중하고, redaction suite는 JSON output/upload/saved draft 모두에서 reused draft secret이 제거되는 계약만 검증한다.

## 코드 커밋

- `94523cb` — `Split CLI share JSON upload output tests`

## 변경 파일

- `tests/cli-share-json-upload-output.test.ts`
- `tests/cli-share-json-upload-redaction.test.ts`

## 분리 범위

- `tests/cli-share-json-upload-output.test.ts`
  - Uploaded JSON output에 collected draft와 upload metadata가 포함되는 smoke contract.
  - User note가 summary에 섞이지 않는 JSON output contract.
  - Payload hash and credential binding hash persistence contract.
  - Successful JSON share upload에서 `--no-save-cursor`가 collection state를 저장하지 않는 contract.
- `tests/cli-share-json-upload-redaction.test.ts`
  - Reused draft summary/model/agent_modes에 포함된 secret redaction.
  - Redacted content가 JSON stdout, ingest upload payload, saved draft에만 남는 contract.

## 검증 증거

- Baseline: `npm test -- --run tests/cli-share-json-upload-output.test.ts` — 1 file / 3 tests 통과.
- Targeted split suite: `npm test -- --run tests/cli-share-json-upload-output.test.ts tests/cli-share-json-upload-redaction.test.ts` — 2 files / 3 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 197 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: changed share JSON upload files에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-share-json-upload-output.test.ts`: 146 pure LOC.
  - `tests/cli-share-json-upload-redaction.test.ts`: 111 pure LOC.
- LSP diagnostics: changed `.ts` files 모두 `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/cli-share-json-upload-output.test.ts` reviewability split은 완료됨.
- 현재 CLI 테스트 >200 pure LOC scan 기준 다음 최대 후보는 `tests/upload-preflight.test.ts` 244 pure LOC이고, 그 다음은 `tests/duplicate-draft.test.ts` 243 pure LOC, `tests/cli-collect.test.ts` 242 pure LOC다.

## 범위 제한

- 신규 앱 기능 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
