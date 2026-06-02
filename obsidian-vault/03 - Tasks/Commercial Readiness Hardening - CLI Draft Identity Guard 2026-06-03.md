---
title: Commercial Readiness Hardening - CLI Draft Identity Guard 2026-06-03
aliases:
  - CLI Draft Embedded ID Guard
  - Draft Filename Identity Guard
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/drafts
  - agentfeed/local-state
status: done
created: 2026-06-03
updated: 2026-06-03
---

# CLI Draft Identity Guard

> [!success] Outcome
> `agentfeed publish/share/open/discard` 계열이 `--id`로 지정한 draft 파일을 읽을 때, JSON 내부 `draft.id`가 파일명과 다르면 즉시 fail-closed 하도록 보강했다.

## Risk

> [!bug] P2 local state integrity
> `.agentfeed/drafts/draft_a.json` 내부 `id`가 `draft_b`로 손상/수정된 상태에서 `agentfeed publish --id draft_a`를 실행하면, 업로드 후 metadata write가 `draft_b` 경로로 향할 수 있었다. 이 경우 사용자가 지정한 draft와 실제 저장되는 upload state가 분리되어 중복 업로드, pending draft 잔존, 다른 draft metadata 오염으로 이어질 수 있다.

## Changes

- `src/draft/read.ts`
  - `readDraft(cwd, id)`가 runtime shape validation 후 `draft.id === id`를 추가 검증한다.
  - 불일치 시 `Run agentfeed collect to create a fresh draft.` 안내와 함께 fail-closed 한다.
- `tests/draft-id-path-safety.test.ts`
  - path traversal 방어 외에 embedded ID mismatch 회귀 테스트를 추가했다.

## Verification

- `npm test -- --run tests/draft-id-path-safety.test.ts`
- `npm run typecheck`
- 후속 전체 gate: `agentfeed-dev/scripts/test-all.sh`

## Related

- [[Commercial Readiness Hardening - Runtime Contract and Ingest Identity 2026-06-03]]
- [[Collection System]]
- [[Active Tasks]]
