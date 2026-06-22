---
title: CLI Cached Upload Reuse Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI cached upload reuse test split
  - CLI cached upload reuse test split
---

# CLI Cached Upload Reuse Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 cached upload reuse, credential binding mismatch, redacted payload hash matching, stale cache fail-closed, and cached review URL trust contracts를 focused cached-upload reuse suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `91d632c Split CLI cached upload reuse tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-cached-upload-reuse-contract.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / cached upload reuse and stale-cache safety suite isolation

## Background

[[CLI Upload Lock Contract Test Split 2026-06-22]] 이후 `tests/api-hook.test.ts`에는 upload lock lifecycle이 아닌 cached upload reuse and stale cache validation contracts가 남아 있었다. 이 케이스들은 backend upload response handling보다 local draft upload cache metadata, credential binding, payload hash, and cached review URL trust policy에 응집돼 있어 focused suite로 이동했다.

## Changes

- `tests/cli-cached-upload-reuse-contract.test.ts` 추가.
  - 이미 업로드된 draft cache가 redacted payload와 credential binding이 일치하면 재업로드 없이 재사용된다.
  - 다른 credential binding의 upload cache는 재사용하지 않고 새 업로드로 갱신한다.
  - cached reuse status가 payload hash, credential binding, review URL, API base URL mismatch를 구분해 보고한다.
  - 첫 upload가 public fields를 redact한 뒤 unchanged draft는 같은 upload payload hash로 재사용된다.
  - local redacted payload가 cache hash와 달라진 stale uploaded draft는 upload 없이 `DRAFT_UPLOAD_STALE`로 fail-closed한다.
  - cached review URL이 trusted host/path/query/fragment contract를 벗어나면 metadata를 invalid 처리한다.
- `tests/api-hook.test.ts`에서 cached upload reuse/stale-cache block과 전용 helper/imports를 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/api-hook.test.ts: 1 file / 26 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-cached-upload-reuse-contract.test.ts: 2 files / 26 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 144 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 390 pure LOC after split; still oversized.
tests/cli-cached-upload-reuse-contract.test.ts: 203 pure LOC; warning band but under 250 defect ceiling; no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits.
```

## Follow-up

> [!todo]
> `tests/api-hook.test.ts` remains oversized at 390 pure LOC. Continue only cohesive, behavior-preserving splits with green coverage. Likely next groups: upload response/status contract remnants, re-scan redactions, timeout reconciliation tests, publish API friendly error handling, visibility contract/basic publish/concurrency tests.
