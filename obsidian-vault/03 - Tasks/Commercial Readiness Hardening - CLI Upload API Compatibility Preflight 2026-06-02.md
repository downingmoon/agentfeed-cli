---
title: Commercial Readiness Hardening - CLI Upload API Compatibility Preflight 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/cli
  - commercial-readiness
  - api-compatibility
  - upload-safety
status: done
aliases:
  - CLI upload API compatibility preflight
---

# Commercial Readiness Hardening - CLI Upload API Compatibility Preflight 2026-06-02

관련 지도: [[AgentFeed CLI MOC]]  
관련 영역: [[Integration - CLI Backend Frontend]], [[Auth & Credential Safety]]

## 목표

`agentfeed doctor`만 API metadata compatibility를 확인하고 `share`/`publish`/`collect --upload`는 바로 `/ingest/worklogs`로 전송하던 gap을 닫는다. 사용자가 stale 또는 incompatible API에 draft를 업로드하기 전에 `/metadata` contract를 확인하고 fail-closed 한다.

> [!important] Acceptance
> - `agentfeed share --json`이 incompatible `/v1/metadata`를 받으면 `/v1/ingest/worklogs`를 호출하지 않는다.
> - 에러 메시지는 `API compatibility check failed`와 `agentfeed doctor` 안내를 포함한다.
> - `collect --json --upload`, `share`, `publish`, `preview --remote`의 실제 upload/remote ingest path가 compatibility preflight를 수행한다.
> - 이미 업로드된 cached review draft를 재사용하는 `publish`는 새 전송이 없으므로 DNS/metadata preflight 없이 기존 cached review URL trust policy만 유지한다.

## RED

- `tests/cli-share.test.ts`
  - 추가한 regression: incompatible metadata server가 `/v1/metadata`를 반환하고 `/v1/ingest/worklogs` request count를 기록.
  - 구현 전 실패: CLI가 metadata를 무시하고 `/ingest/worklogs`까지 호출해 `AgentFeed API returned an invalid upload response`를 출력.

## 변경

- `AgentFeed-CLI/src/cli/index.ts`
  - `requireApiCompatibilityBeforeUpload(apiBaseUrl)` helper 추가.
  - incompatible metadata/DNS/timeout이면 upload 전에 사용자에게 `agentfeed doctor` 확인을 안내하며 fail-closed.
  - `collect --json --upload`, `share --json`, human `share`, `preview --remote`, uncached `publish`에 preflight 적용.
  - cached upload reuse publish는 실제 전송이 없으므로 preflight 대상에서 제외.
- `AgentFeed-CLI/tests/cli-share.test.ts`
  - incompatible metadata가 ingest 전송을 차단하는 regression 추가.
  - upload 성공 mock server에 compatible metadata route 추가.
- `AgentFeed-CLI/tests/cli-collect.test.ts`
  - collect upload mock server에 compatible metadata route 추가.

## Evidence

- [x] `npm test -- --run tests/cli-share.test.ts tests/cli-collect.test.ts`
  - 32 tests passed.
- [x] `npm test -- --run`
  - 22 files, 331 tests passed.
- [x] `npm run typecheck`
  - `tsc --noEmit` passed.
- [x] `npm run release:preflight`
  - package/release gate passed.
- [x] `npm audit --audit-level=moderate`
  - found 0 vulnerabilities.
- [x] `agentfeed-dev ./scripts/test-all.sh`
  - CLI 331 tests, Frontend CI/build/contracts/audit, Backend 292 tests, OpenAPI gate, Alembic offline chain 통과.

## 병렬 감사 반영

- CLI 감사가 `checkApiCompatibility`가 `doctor`에만 연결되어 있고 `share`/`publish`가 stale API로 바로 업로드될 수 있다고 지적했다.
- 이번 변경은 CLI command surface에서 실제 전송 직전 compatibility preflight를 강제해 사용자-facing upload path를 fail-closed로 만든다.

## 남은 후보

- API client 단위 `publishDraft`를 직접 호출하는 내부/library path까지 preflight를 확장할지 검토한다. 현재 public CLI commands는 보호되며, API client tests에는 low-level upload semantics가 남아 있다.
- Frontend `WorklogReviewPage`의 `apiConfigError` recovery branch 보강.
