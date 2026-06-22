---
title: CLI Preview Test Split 2026-06-22
aliases:
  - CLI preview split
  - CLI remote preview local rendering split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 7d6a720
---

# CLI Preview Test Split 2026-06-22

## 요약

CLI oversized `tests/cli-preview.test.ts`에서 remote preview JSON/invalid contracts, API metadata compatibility fail-fast, local preview rendering/JSON redaction/uploaded next-action coverage를 focused suites로 분리했다. 원본 suite는 failure guidance 전용으로 줄였고 원본 및 신규 suites 모두 250 pure LOC ceiling 아래다.

## 코드 커밋

- `7d6a720` — `Split CLI preview tests`

## 변경 파일

- `tests/cli-preview.test.ts`
- `tests/cli-preview-remote.test.ts`
- `tests/cli-preview-remote-compatibility.test.ts`
- `tests/cli-preview-local-rendering.test.ts`

## 분리 범위

- `tests/cli-preview.test.ts`
  - Project initialization guidance.
  - Missing local draft guidance.
  - Structured JSON errors for empty local draft state.
  - Missing draft-id guidance.
  - Missing-token guidance before remote preview.
- `tests/cli-preview-remote.test.ts`
  - Parseable remote preview JSON without human UX headings.
  - Remote invalid preview JSON next-action guidance.
- `tests/cli-preview-remote-compatibility.test.ts`
  - Incompatible API metadata refusal before remote preview POST.
- `tests/cli-preview-local-rendering.test.ts`
  - Human-readable local preview action guidance.
  - Narrow terminal wrapping for summary/metrics.
  - Uploaded draft open workflow ordering.
  - Public draft JSON redaction persistence.
  - Uploaded draft preview JSON next-action ordering.

## 검증 증거

- Baseline filter: 원본 `tests/cli-preview.test.ts` selected preview cluster 8 tests 통과, 5 skipped.
- Split filter: `tests/cli-preview.test.ts tests/cli-preview-remote.test.ts tests/cli-preview-remote-compatibility.test.ts tests/cli-preview-local-rendering.test.ts` + 동일 filter — 8 tests 통과, 5 skipped.
- Targeted split suite: `npm test -- --run tests/cli-preview.test.ts tests/cli-preview-remote.test.ts tests/cli-preview-remote-compatibility.test.ts tests/cli-preview-local-rendering.test.ts` — 4 files / 13 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 189 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: changed preview suites에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-preview.test.ts`: 120 pure LOC.
  - `tests/cli-preview-remote.test.ts`: 189 pure LOC.
  - `tests/cli-preview-remote-compatibility.test.ts`: 112 pure LOC.
  - `tests/cli-preview-local-rendering.test.ts`: 185 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/cli-preview.test.ts` oversized는 해소됨.
- 현재 CLI 테스트 oversized scan 기준 다음 최대 후보는 `tests/git-draft.test.ts` 401 pure LOC이고, 그 다음은 `tests/cli-drafts.test.ts` 363 pure LOC, `tests/release-preflight.test.ts` 351 pure LOC다.

## 범위 제한

- 신규 앱 기능 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
