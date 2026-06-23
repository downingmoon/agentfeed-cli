---
title: CLI Draft Session Aggregation Split 2026-06-23
aliases:
  - CLI draft session aggregation split
  - Draft session aggregation split
tags:
  - agentfeed/cli
  - project/tasks
  - refactor
  - drafts
  - collection
status: done
created: 2026-06-23
updated: 2026-06-23
code_commit: "f78d513 Split draft session aggregation; 540e0a6 Trim draft session aggregation EOF"
---

# CLI Draft Session Aggregation Split 2026-06-23

## Summary

CLI draft creation module에서 agent session aggregation, model/metric merging, collection source quality selection 책임을 `src/draft/session-aggregation.ts`로 분리했다. `src/draft/create.ts`의 public exports인 `createEmptyDraft`, `collectDraftWithStatus`, `collectDraft`는 유지했다.

## Code changes

- `src/draft/create.ts`
  - session metric aggregation helpers 제거.
  - collect orchestration, fingerprint/duplicate detection, draft assembly 책임 유지.
  - pure LOC: 607 → 399.
- `src/draft/session-aggregation.ts`
  - `mergeChangedFiles`, `sumChangedFileLines`, `addOptionalCounts` 소유.
  - multi-agent session merge, selected primary source, collection window merge, agent metric filtering 소유.
  - pure LOC: 213.
- Follow-up hygiene commit `540e0a6`은 initial split commit의 EOF blank line 경고를 amend 없이 제거했다.

## Verification

> [!success]
> Code commits `f78d513` and `540e0a6` 검증 완료.

- LSP diagnostics: `src/draft/create.ts`, `src/draft/session-aggregation.ts` 모두 `Transport closed`로 실패. 기존 LSP runtime gap으로 기록하고 대체 검증 수행.
- Initial `npm run typecheck`: pass after extraction boundary repair.
- `npm run build`: pass.
- Targeted collection/session/fingerprint/configured-command suites: 22 files / 98 tests pass.
- Full CLI suite: 226 files / 848 tests pass.
- `git diff --check`: pass after EOF hygiene commit.
- New module audit: `src/draft/session-aggregation.ts`에서 comment/no-any/no-ts-ignore/no-ts-expect-error grep clean.
- Manual built CLI smoke:
  - Temporary git project created.
  - `agentfeed init --project-name agentfeed-smoke-project --json` pass.
  - `agentfeed collect --source other --json --force --no-save-cursor` pass.
  - Saved draft file existed at `.agentfeed/drafts/<draft_id>.json`; output and saved draft IDs matched.

## Boundaries

- 신규 앱 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- push/deploy 없음.
- CLI-Frontend-Backend external contract 변경 없음.

## Remaining follow-up candidates

- `src/collectors/agent-session.ts`: 1157 pure LOC.
- `src/draft/create.ts`: 399 pure LOC, 추가 split 후보.
- `src/config/credentials.ts`: 425 pure LOC, 추가 split 후보.
