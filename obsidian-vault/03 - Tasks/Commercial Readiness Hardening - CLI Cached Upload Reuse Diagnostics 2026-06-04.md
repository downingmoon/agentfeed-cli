---
title: Commercial Readiness Hardening - CLI Cached Upload Reuse Diagnostics 2026-06-04
aliases:
  - CLI cached upload reuse diagnostics
  - Cached private review cache reason hardening
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/cache
  - obsidian/task
status: done
created: 2026-06-04
---

# Commercial Readiness Hardening - CLI Cached Upload Reuse Diagnostics 2026-06-04

> [!summary]
> CLI cached private review reuse now returns structured failure reasons, and `agentfeed publish` shows why a saved upload cache cannot skip explicit confirmation.

## 변경 요약

- `src/api/client.ts`
  - `cachedUploadReuseStatusForCredentials()`를 추가했습니다.
  - 기존 `cachedUploadReusableForCredentials()`는 boolean wrapper로 유지해 호환성을 보존했습니다.
  - Failure reason 예시: `missing_review_url`, `base_url_mismatch`, `payload_hash_mismatch`, `credential_binding_mismatch`, `invalid_review_url`.
- `src/cli/index.ts`
  - `publish` confirmation 화면에서 saved private review cache 재사용 거부 이유를 표시합니다.
  - `--yes`/`--json` 경로의 기존 upload/preflight behavior는 유지합니다.
- `tests/api-hook.test.ts`
  - reusable/edited credential mismatch/missing URL/base URL mismatch reason을 regression으로 고정했습니다.
- `tests/cli-share.test.ts`
  - 다른 token/user binding의 cached upload가 confirmation을 요구할 때 이유를 출력하는지 검증했습니다.

## 검증

- `npm test -- --run tests/api-hook.test.ts tests/cli-share.test.ts`
  - 2 files, 127 tests passed
- `npm run typecheck`
- `npm test -- --run`
  - 23 files, 396 tests passed
- `npm run release:preflight`
  - build/typecheck/test, npm pack dry-run, installed package smoke passed

## 연결 문서

- [[Active Tasks]]
- [[AgentFeed CLI MOC]]
- [[Commercial Readiness Hardening - Cached Publish Cursor and Branch Drift Gates 2026-06-04]]
