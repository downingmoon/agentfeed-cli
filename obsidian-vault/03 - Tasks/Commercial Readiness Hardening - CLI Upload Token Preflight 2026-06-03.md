---
title: CLI Upload Token Preflight
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/auth
  - agentfeed/upload
status: completed
related:
  - "[[Active Tasks]]"
  - "[[Auth & Credential Safety]]"
  - "[[Collection System]]"
  - "[[Commercial Readiness Hardening - CLI Upload API Compatibility Preflight 2026-06-02]]"
---

# CLI Upload Token Preflight

## 목표

Fresh private review upload가 실제 `/v1/ingest/worklogs`를 호출하기 전에 현재 credentials의 ingestion token이 서버에서 유효한지 확인한다.

> [!success]
> `agentfeed collect --json --upload`, `agentfeed share`, `agentfeed share --json`, `agentfeed publish --yes` fresh upload 경로가 `/v1/metadata` 호환성 확인 후 `/v1/ingest/status` token preflight를 통과해야만 ingest를 호출하도록 정렬했다.

## 변경

- `src/cli/index.ts`
  - `requireUploadPreflight(credentials)`를 추가했다.
  - 순서: API metadata compatibility → ingestion token status → ingest upload.
  - token preflight 실패 시 `agentfeed login` 또는 `agentfeed rotate` 안내와 함께 fail-closed 처리한다.
  - cached reusable upload는 기존처럼 서버 재전송이 없으므로 preflight를 생략한다.
- `tests/cli-share.test.ts`
  - share JSON upload token preflight 실패 시 ingest 0회 회귀 테스트 추가.
  - direct publish token preflight 실패 시 ingest 0회 회귀 테스트 추가.
  - successful upload fixtures에 `/v1/ingest/status` healthy response를 추가했다.
- `tests/cli-collect.test.ts`
  - collect JSON upload token preflight 실패 시 ingest 0회 회귀 테스트 추가.
  - successful upload fixtures에 `/v1/ingest/status` healthy response를 추가했다.

## 검증

```bash
npm test -- --run tests/cli-share.test.ts tests/cli-collect.test.ts
```

결과: 2 files / 49 tests passed.

## 남은 리스크

- hosted 상용 readiness는 여전히 외부 배포/DNS에 막혀 있다.
  - `api.agentfeed.dev` DNS unresolved
  - `https://agentfeed.dev/` root stale `/login` redirect
