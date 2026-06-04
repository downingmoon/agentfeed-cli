---
title: Commercial Readiness Hardening - CLI JSON Upload Metadata Consistency 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/contracts
  - hardening
status: completed
created: 2026-06-04
aliases:
  - CLI JSON upload metadata consistency
---

# Commercial Readiness Hardening - CLI JSON Upload Metadata Consistency 2026-06-04

## 목적

`agentfeed share --json` 및 `agentfeed collect --json --upload`는 업로드 후 저장된 draft에는 캐시 재사용 메타데이터를 남기지만, 터미널 JSON 출력의 `draft.upload`에는 수동으로 만든 최소 필드만 포함할 수 있었다.

> [!warning]
> JSON 출력은 자동화 스크립트가 신뢰하는 계약이다. 저장된 draft에는 `payload_hash`, `credential_binding_hash`, `api_base_url`이 있는데 출력 draft에는 없으면, 사용자는 업로드 캐시가 안전하게 바인딩됐는지 확인할 수 없다.

## 변경 요약

- `src/cli/index.ts`
  - `collect --json --upload` 후 `publishDraft()`가 저장한 draft를 다시 읽어 출력한다.
  - `share --json` 후에도 저장된 draft를 다시 읽어 출력한다.
  - `--open-review` handoff 정보는 기존처럼 출력 payload에만 추가하고 저장 draft에는 불필요하게 남기지 않는다.
- `tests/cli-collect.test.ts`
  - collect JSON upload 출력의 `draft.upload`가 저장 draft와 완전히 같은지 검증한다.
  - `payload_hash`와 `credential_binding_hash`가 현재 payload/token binding 기준으로 채워지는지 검증한다.
- `tests/cli-share.test.ts`
  - share JSON upload 출력의 `draft.upload`가 저장 draft와 완전히 같은지 검증한다.
  - JSON 자동화 소비자가 업로드 캐시 메타데이터를 바로 확인할 수 있도록 contract를 고정했다.

## 검증

> [!success] Fresh local verification
> - `npm run build` ✅
> - `npm test -- tests/cli-share.test.ts tests/cli-collect.test.ts` ✅ — 52 tests
> - `npm run typecheck` ✅
> - `npm test -- --run` ✅ — 396 tests

## 남은 외부 차단 조건

- 이 변경은 CLI 로컬 JSON contract 보강이다.
- 전체 상용화 hosted E2E는 여전히 `api.agentfeed.dev` DNS / `agentfeed.dev` stale redirect 문제가 해결되어야 완전 검증 가능하다.

## 관련 노트

- [[Commercial Readiness Hardening - User Dashboard Worklog Contracts and Collect JSON Stability 2026-05-31]]
- [[Commercial Readiness Hardening - Cached Publish Cursor and Branch Drift Gates 2026-06-04]]
- [[Commercial Readiness Hardening - Public Project Stats Scalability 2026-06-04]]
- [[Active Tasks]]
- [[AgentFeed CLI MOC]]
