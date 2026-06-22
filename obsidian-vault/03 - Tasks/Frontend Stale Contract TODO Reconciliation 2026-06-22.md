---
title: Frontend Stale Contract TODO Reconciliation 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/documentation
  - project/tasks
aliases:
  - 2026-06-22 frontend stale contract TODO reconciliation
  - Frontend stale contract TODO reconciliation
---

# Frontend Stale Contract TODO Reconciliation 2026-06-22

> [!success]
> Frontend contract/test TODO 문서 중 이미 코드와 source-contract로 처리된 항목을 현재 source evidence 기준으로 정리했다. 신규 기능, 서버/인프라/CI/CD 변경, 배포는 없다.

## Scope

- 대상 repo: `agentfeed-frontend`, `agentfeed-cli/obsidian-vault`
- 코드 변경: 없음
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: stale TODO reconciliation / documentation accuracy hardening

## Findings

1. `worklog-review-strict-fields.contract.test.ts`는 현재 5 pure LOC runner이고, assertion flow는 `worklog-review-strict-field-assertions.ts`가 소유한다.
2. `worklog-review-strict-fields.contract.test.ts`는 이미 [[Frontend Worklog Review Strict Field Assertion Move 2026-06-18]]와 Active Tasks에 완료 기록이 있다.
3. `adaptWorklogCard()` return cast TODO는 이미 제거되어 `src/lib/worklog-card-source-assertions.ts`가 재도입을 막고 있다.
4. `SettingsPage`, `ProjectsPage`, `ProjectDetailPage` visibility select cast TODO는 이미 `projectVisibilityFromSelect()`와 `src/lib/project-visibility-source-assertions.ts`가 처리하고 있다.

## Evidence

```text
src/lib/worklog-review-strict-fields.contract.test.ts: 5 pure LOC
src/lib/worklog-review-strict-field-assertions.ts: 46 pure LOC
src/lib/project-visibility-source-assertions.ts: 22 pure LOC
src/lib/worklog-card-source-assertions.ts: 124 pure LOC
```

Source checks:

```text
rg "as ProjectVisibility|event\.target\.value as ProjectMutationForm|\} as Worklog & \{ _author: User \}|adaptWorklogCard\(w\) as Worklog" \
  src/components/pages/SettingsPage.tsx \
  src/components/pages/ProjectsPage.tsx \
  src/components/pages/ProjectDetailPage.tsx \
  src/lib/worklog-adapters.ts
```

Result: no matches.

Verification:

```text
npm run test:contracts: passed
npm run lint: passed
```

Attempted narrow runner:

```text
node scripts/run-contract-tests.mjs src/lib/project-visibility-source-contract.test.ts src/lib/worklog-card-source-contract.test.ts src/lib/worklog-review-strict-fields.contract.test.ts
```

Result: failed with `spawnSync tsc ENOENT`; the contract runner does not support direct path arguments in this form. Full `npm run test:contracts` was used as authoritative coverage.

## Documentation updates

- Updated [[Frontend API JSON Boundary Assertion Move 2026-06-20]] to replace the stale `worklog-review-strict-fields.contract.test.ts` current candidate with the current state.
- Updated [[Frontend Worklog Visibility Fallback Guard 2026-06-10]] follow-up checkboxes for already-enforced source contracts.
- Added Active Tasks entry for this reconciliation.

## Follow-up

> [!todo]
> Continue source-contract re-scan from the current codebase rather than older `Current next re-scan candidate` lines, because several historical docs intentionally preserve old queue snapshots.
