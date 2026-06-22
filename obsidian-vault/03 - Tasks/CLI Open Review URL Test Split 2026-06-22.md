---
title: CLI Open Review URL Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI open review URL test split
  - CLI open review URL test split
---

# CLI Open Review URL Test Split 2026-06-22

> [!success]
> CLI `tests/cli-share.test.ts`에서 `agentfeed open` review URL trust/rejection/fallback 계약을 별도 suites로 분리했다. CLI runtime 동작 변경 없이 기존 share/open 관련 계약을 유지했고, targeted tests 44 passed 및 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `195283c Split CLI open review URL tests`
- 변경 파일:
  - `tests/cli-share.test.ts`
  - `tests/cli-open-review-helpers.ts`
  - `tests/cli-open-review-trust.test.ts`
  - `tests/cli-open-review-rejection.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / review URL trust-policy coverage hardening

## Background

`tests/cli-share.test.ts`는 share/publish/upload/open 계약이 한 파일에 누적되어 있었다. 직전 guidance/dry-run split 이후에도 2271 pure LOC였고, review URL trust policy와 browser open rejection/fallback cases가 upload/publish cases와 섞여 있었다.

## Changes

- `tests/cli-open-review-helpers.ts`를 추가해 `agentfeed open` review URL suites의 temp repo/home setup, fake browser opener, uploaded draft writer, CLI execution harness를 공유한다.
- `tests/cli-open-review-trust.test.ts`를 추가해 trusted `agentfeed.dev`, local API base, stored upload API base, explicit split-host `AGENTFEED_REVIEW_BASE_URL`, saved `review_base_url` metadata trust 계약을 분리했다.
- `tests/cli-open-review-rejection.test.ts`를 추가해 unsafe cached review URL, manual browser-open fallback, untrusted stored/current config mismatch, split-host missing explicit origin, unsafe split-host URLs, fake `127.*` local hostname rejection 계약을 분리했다.
- `tests/cli-share.test.ts`에서는 해당 review URL open/trust/rejection/fallback block을 제거하고 upload, JSON upload, publish, cached upload, locking, handoff warning cases를 유지했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Targeted split: npm test -- --run tests/cli-open-review-trust.test.ts tests/cli-open-review-rejection.test.ts tests/cli-share.test.ts: 3 files / 44 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 120 files / 848 tests passed
Git whitespace: git diff --check: passed
No-excuse grep: no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions in changed files
LSP diagnostics: unavailable earlier because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC audit:

```text
tests/cli-share.test.ts: 1927 pure LOC
tests/cli-open-review-helpers.ts: 97 pure LOC
tests/cli-open-review-trust.test.ts: 90 pure LOC
tests/cli-open-review-rejection.test.ts: 108 pure LOC
```

## Follow-up

> [!todo]
> `tests/cli-share.test.ts` remains oversized at 1927 pure LOC. Continue behavior-preserving splits by cohesive groups: upload preflight failures, JSON upload side effects, cached publish reuse, publish locking, and handoff warning coverage. Keep targeted verification plus full CLI suite before each commit.
