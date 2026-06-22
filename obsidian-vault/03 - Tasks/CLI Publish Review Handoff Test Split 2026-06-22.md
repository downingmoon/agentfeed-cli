---
title: CLI Publish Review Handoff Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI publish review handoff test split
  - CLI publish review handoff test split
---

# CLI Publish Review Handoff Test Split 2026-06-22

> [!success]
> CLI `tests/cli-share.test.ts`에서 publish review URL browser/clipboard handoff policy 계약을 `cli-publish-review-handoff` suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `94eda95 Split CLI publish review handoff tests`
- 변경 파일:
  - `tests/cli-share.test.ts`
  - `tests/cli-publish-review-handoff.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / publish review URL handoff policy isolation

## Background

`tests/cli-share.test.ts`는 upload confirmation split 이후에도 publish review URL auto-open, CI no-open policy, explicit `--no-open-review`, and handoff-failure warning 계약을 함께 들고 있었다. Review URL handoff behavior는 publish upload completion 이후의 side-effect policy라 share dry-run/remaining completion coverage와 분리 가능한 책임이다.

## Changes

- `tests/cli-publish-review-handoff.test.ts`를 추가해 다음 계약을 분리했다.
  - project config가 review auto-open을 허용하면 publish 후 review URL을 browser opener로 전달한다.
  - CI에서는 명시 요청 없이는 review URL을 auto-open하지 않는다.
  - `--no-open-review`는 configured auto-open을 억제한다.
  - requested handoff 실패 시 human output에 clipboard/browser warning과 manual review URL을 표시한다.
- `tests/cli-share.test.ts`에서 해당 4개 cases와 관련 helper/import를 제거했다.
- JSON fixture parsing은 `Record<string, unknown>` boundary helper로 정리해 test-side escape hatch를 줄였다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline: npm test -- --run tests/cli-share.test.ts: 1 file / 6 tests passed
Targeted split: npm test -- --run tests/cli-publish-review-handoff.test.ts tests/cli-share.test.ts: 2 files / 6 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 131 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
No-excuse grep: no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions in changed files
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC audit:

```text
tests/cli-share.test.ts: 219 pure LOC
tests/cli-publish-review-handoff.test.ts: 236 pure LOC
```

## Follow-up

> [!success]
> Completed: the remaining human share upload completion and dry-run command coverage were split and the generic `tests/cli-share.test.ts` catch-all suite was removed in [[CLI Share Command Residual Test Split 2026-06-22]].
