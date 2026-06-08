---
title: CLI Release Metadata Homepage Guard 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/cli
  - agentfeed/release
  - agentfeed/metadata
status: completed
---

# CLI Release Metadata Homepage Guard 2026-06-08

## 목적

`agentfeed.dev` 도메인은 아직 준비되지 않았는데 CLI `package.json.homepage`와 release preflight가 `https://agentfeed.dev`를 고정하고 있었다.

사용자가 npm/package page에서 클릭하는 homepage는 실제 접근 가능한 문서를 가리켜야 하므로, production domain이 확정되기 전까지 canonical GitHub README를 homepage로 사용하도록 정리했다.

관련:

- [[Active Tasks]] `Public release 메모`
- [[Runtime Configuration]]

## 변경 내용

- `package.json`
  - `homepage`를 `https://github.com/downingmoon/agentfeed-cli#readme`로 변경.
- `scripts/release-preflight.mjs`
  - release metadata guard가 GitHub README homepage를 강제하도록 변경.
- `tests/version.test.ts`, `tests/release-preflight.test.ts`
  - package metadata expectation 갱신.
- `vitest.config.ts`
  - release preflight가 CLI subprocess/git/tarball/collector smoke를 병렬로 돌리는 현실을 반영해 `testTimeout: 20_000` 명시.
- 장기 collector tests
  - 실제 git/collector flow를 수행하는 timeout-sensitive 테스트에 명시 timeout 부여.

## RED / GREEN

> [!failure] RED
> tests/preflight guard를 GitHub README homepage 기준으로 바꾼 직후 `tests/version.test.ts`가 현재 `package.json.homepage = https://agentfeed.dev` 때문에 실패했다.

> [!success] GREEN
> - `npx vitest run tests/version.test.ts tests/release-preflight.test.ts --reporter=verbose`
> - `npm run build`
> - `npm run typecheck`
> - `npx vitest run tests/cli-help.test.ts -t "help surface" --reporter=verbose`
> - `npx vitest run tests/git-draft.test.ts -t "prefers a detected enabled agent" --reporter=verbose`
> - `npx vitest run tests/session-collector.test.ts -t "auto-collects project-local Cursor metadata|falls back to generic plugin signals" --reporter=verbose`
> - `npm run release:preflight` — 27 files, 541 tests passed, installed tarball smoke passed.

## 후행 과제

- [ ] 실제 production domain이 준비되면 owner 승인 후 `package.json.homepage`를 production docs/home URL로 다시 변경한다.
- [ ] public npm release 전 `license`, trusted publishing environment, package homepage 정책을 최종 확인한다.
