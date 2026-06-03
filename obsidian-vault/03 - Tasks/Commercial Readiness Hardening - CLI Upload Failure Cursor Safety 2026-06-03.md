---
title: CLI Upload Failure Cursor Safety
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/collection
  - agentfeed/upload
status: completed
related:
  - "[[Active Tasks]]"
  - "[[Collection System]]"
  - "[[Commercial Readiness Hardening - CLI Upload Token Preflight 2026-06-03]]"
---

# CLI Upload Failure Cursor Safety

## 목표

`collect --upload` 또는 `share --json`가 upload preflight/ingest 단계에서 실패했을 때 collection cursor가 전진하지 않는다는 계약을 회귀 테스트로 고정한다.

> [!success]
> 업로드 실패 후 `last_collected_at`이 저장되지 않아 다음 `agentfeed collect`가 해당 작업 구간을 다시 수집할 수 있다. 이로써 “업로드는 실패했는데 cursor만 전진해서 다음 collect가 비어 보이는” 상용 리스크를 막는다.

## 변경

- `tests/cli-collect.test.ts`
  - token preflight 실패 시 collection cursor 미저장 검증 추가.
  - ingest upload 실패 및 retry 후에도 collection cursor 미저장 검증 추가.
- `tests/cli-share.test.ts`
  - share JSON upload 실패 시 clipboard/browser side effect뿐 아니라 collection cursor도 미저장되는지 검증 추가.

## 검증

```bash
npm test -- --run tests/cli-collect.test.ts tests/cli-share.test.ts
```

결과: 2 files / 51 tests passed.

## 남은 리스크

- hosted 상용 readiness는 여전히 외부 배포/DNS에 막혀 있다.
  - `api.agentfeed.dev` DNS unresolved
  - `https://agentfeed.dev/` root stale `/login` redirect
