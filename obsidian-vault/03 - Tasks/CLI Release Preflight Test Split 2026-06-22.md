---
title: CLI Release Preflight Test Split 2026-06-22
aliases:
  - CLI release preflight split
  - Release preflight workflow smoke split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 32e7bda
---

# CLI Release Preflight Test Split 2026-06-22

## 요약

CLI oversized `tests/release-preflight.test.ts`에서 trusted publishing workflow guardrails와 installed package smoke/platform guardrails를 focused suites로 분리했다. 원본 suite는 npm pack/package metadata, CI/README policy, release tag validation coverage 중심으로 줄였고 원본 및 신규 suites 모두 250 pure LOC ceiling 아래다.

## 코드 커밋

- `32e7bda` — `Split CLI release preflight tests`

## 변경 파일

- `tests/release-preflight.test.ts`
- `tests/release-preflight-trusted-workflow.test.ts`
- `tests/release-preflight-installed-smoke.test.ts`

## 분리 범위

- `tests/release-preflight.test.ts`
  - npm pack JSON parsing and packed file guardrails.
  - npm package metadata contract.
  - CI workflow native Windows DPAPI/package wrapper smoke ordering.
  - README onboarding and credential storage policy documentation guardrails.
  - GitHub release tag validation.
- `tests/release-preflight-trusted-workflow.test.ts`
  - Trusted publishing workflow permissions, concurrency, pinned action SHA, Node/npm versions, tag verification, audit/prepack order, no long-lived token guardrails.
- `tests/release-preflight-installed-smoke.test.ts`
  - Built CLI help/version smoke output.
  - Platform-specific installed bin path and Windows shim execution options.
  - Installed tarball CLI smoke and first-run workflow smoke contracts.
  - Direct invocation detection for Unix and Windows-style paths.

## 검증 증거

- Baseline trusted workflow filter: 원본 `tests/release-preflight.test.ts` — 1 test 통과, 14 skipped.
- Baseline installed smoke/platform filter: 원본 `tests/release-preflight.test.ts` — 5 tests 통과, 9 skipped.
- Targeted split suite: `npm test -- --run tests/release-preflight.test.ts tests/release-preflight-trusted-workflow.test.ts tests/release-preflight-installed-smoke.test.ts` — 3 files / 15 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 195 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: changed release-preflight suites에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/release-preflight.test.ts`: 200 pure LOC.
  - `tests/release-preflight-trusted-workflow.test.ts`: 74 pure LOC.
  - `tests/release-preflight-installed-smoke.test.ts`: 89 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/release-preflight.test.ts` oversized는 해소됨.
- 현재 CLI 테스트 oversized scan 기준 다음 최대 후보는 `tests/cli-share-json-upload-output.test.ts` 245 pure LOC, `tests/upload-preflight.test.ts` 244 pure LOC다.

## 범위 제한

- 신규 앱 기능 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
