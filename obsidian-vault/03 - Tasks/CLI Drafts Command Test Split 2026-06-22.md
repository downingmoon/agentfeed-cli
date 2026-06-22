---
title: CLI Drafts Command Test Split 2026-06-22
aliases:
  - CLI drafts command split
  - CLI drafts discard open split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: f789f24
---

# CLI Drafts Command Test Split 2026-06-22

## 요약

CLI oversized `tests/cli-drafts.test.ts`에서 discard command coverage와 open command coverage를 focused suites로 분리했다. 원본 suite는 drafts list human/JSON output coverage 중심으로 줄였고 원본 및 신규 suites 모두 250 pure LOC ceiling 아래다.

## 코드 커밋

- `f789f24` — `Split CLI drafts command tests`

## 변경 파일

- `tests/cli-drafts.test.ts`
- `tests/cli-drafts-discard.test.ts`
- `tests/cli-drafts-open.test.ts`

## 분리 범위

- `tests/cli-drafts.test.ts`
  - Project initialization guidance before listing drafts.
  - Empty drafts human state and next actions.
  - Human-readable draft summaries, upload guidance, and narrow metrics wrapping.
  - Drafts JSON summary, draft rows, review URL, and next actions.
- `tests/cli-drafts-discard.test.ts`
  - Confirmed discard human output and artifact deletion.
  - Confirmation-required human output and artifact preservation.
  - Discard confirmation/result JSON contracts.
  - Missing draft guidance back to drafts and collect.
- `tests/cli-drafts-open.test.ts`
  - Latest uploaded draft selection when a newer pending draft exists.
  - Saved review URL opening despite invalid current API env URL.
  - Machine-readable open fallback when browser open fails.
  - Pending draft and no-uploaded-draft guidance.

## 검증 증거

- Baseline filter: 원본 `tests/cli-drafts.test.ts` discard/open filter — 9 tests 통과, 8 skipped.
- Targeted split suite: `npm test -- --run tests/cli-drafts.test.ts tests/cli-drafts-discard.test.ts tests/cli-drafts-open.test.ts` — 3 files / 17 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 193 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: changed drafts suites에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-drafts.test.ts`: 162 pure LOC.
  - `tests/cli-drafts-discard.test.ts`: 157 pure LOC.
  - `tests/cli-drafts-open.test.ts`: 176 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/cli-drafts.test.ts` oversized는 해소됨.
- 현재 CLI 테스트 oversized scan 기준 다음 최대 후보는 `tests/release-preflight.test.ts` 351 pure LOC이고, 그 다음은 `tests/cli-init-hook.test.ts` 284 pure LOC, `tests/cli-share-json-upload-output.test.ts` 245 pure LOC다.

## 범위 제한

- 신규 앱 기능 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
