---
title: Commercial Readiness Hardening - Unpublish Command Trust and Feed Follow Auth 2026-05-30
aliases:
  - Unpublish Command Trust Feed Follow Auth
  - 2026-05-30 P1 Unpublish CLI Command Trust Feed Follow
created: 2026-05-30
tags:
  - agentfeed/readiness
  - agentfeed/backend
  - agentfeed/cli
  - agentfeed/frontend
  - project/tasks
status: completed
---

# Commercial Readiness Hardening - Unpublish Command Trust and Feed Follow Auth 2026-05-30

> [!important] 목표
> 병렬 상용화 audit에서 나온 P1 3건을 닫았습니다: Backend `unpublish` 재공개 방지, CLI repo-local command 실행 opt-in화, Frontend feed follow auth funnel 복구.

## 배경

- Backend `/v1/worklogs/{id}/unpublish`가 `PublishWorklogRequest`를 재사용해 body 기본값 `visibility=public`으로 published worklog를 다시 public 상태로 만들 수 있었습니다.
- CLI `collect`/`share`가 repo-local `.agentfeed/config.json`의 `run_tests_on_collect=true`와 `commands.test/build`를 신뢰해 기본 실행할 수 있었습니다.
- Frontend `/feed` Rising builders `Follow` CTA는 signed-out 상태에서 OAuth로 가지 않고 profile page로 이동해 primary engagement action이 끊겼습니다.

## 구현 요약

### Backend

- `UnpublishWorklogRequest`를 분리해 `visibility`를 `private | unlisted`로 제한하고 기본값을 `private`로 고정했습니다.
- `unpublish_worklog`는 새 schema만 받도록 바꿔 `public` 전환 경로를 제거했습니다.
- regression test로 기본 private, public validation rejection, unlisted downgrade를 검증했습니다.

### CLI

- `collectDraftWithStatus` / `collectDraft`에 `runConfiguredCommands` 옵션을 추가했습니다.
- `agentfeed collect --run-configured-commands`, `agentfeed share --run-configured-commands`에서만 configured/auto test-build command를 실행합니다.
- `share --dry-run`은 opt-in flag가 있어도 계속 command 실행을 차단합니다.
- README와 CLI spec에 새 trust boundary를 기록했습니다.

> [!warning] CLI trust boundary
> `.agentfeed/config.json`은 repository-local 파일이라 cloned repo에서 신뢰할 수 없습니다. 기본 수집은 실행 없이 metadata/session evidence만 사용하고, 사용자가 repo config/scripts를 신뢰할 때만 `--run-configured-commands`를 붙입니다.

### Frontend

- feed follow intent를 `followIntentForAuthState` helper로 분리했습니다.
- auth loading 중에는 Follow button을 disabled/no-op 처리합니다.
- signed-out click은 현재 `/feed?...` route를 보존하는 `redirectToSignInForCurrentRoute()`로 OAuth flow에 진입합니다.
- signed-in click은 기존 optimistic follow/unfollow path를 유지합니다.

## 검증 결과

> [!success] Gate 통과
> 세 레포 개별 gate와 `agentfeed-dev make test`가 모두 통과했습니다.

- Backend targeted: `uv run pytest -q tests/test_contracts.py -k 'unpublish or publish_unlisted_rejects_unresolved_high_privacy_findings'` → 6 passed
- Backend full: `uv run ruff check app tests && uv run python -m compileall -q app tests && uv run pytest -q` → 141 passed
- CLI targeted: `npm test -- --run tests/git-draft.test.ts tests/share.test.ts tests/cli-share.test.ts` → 25 passed
- CLI full: `npm run typecheck && npm test -- --run && npm run build` → 175 passed
- Frontend: `npm run test:contracts && npm run lint && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Integration: `make test` in `agentfeed-dev` → passed, including CLI `prepack`, frontend build, backend ruff/pytest, Alembic offline migration chain

## 계약

- `publish`만 `public` visibility transition을 만들 수 있습니다.
- `unpublish`는 `private` 기본값이며 `unlisted` downgrade만 허용합니다.
- CLI repo-local configured commands are opt-in only.
- Feed follow signed-out intent는 profile navigation이 아니라 OAuth sign-in redirect입니다.

## 남은 리스크 / 다음 후보

- Backend soft-deleted user filtering on public discovery surfaces는 정책상 account deletion privacy가 강화되면 P1로 승격할 수 있습니다.
- CLI upload retry/backoff와 preview JSON re-scan은 P2 resilience/privacy hardening 후보입니다.
- Frontend protected route direct links는 signed-out intent preservation을 더 넓게 맞추면 conversion이 좋아집니다.

## 관련 링크

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[Collection System]]
- [[Privacy Safety]]
- [[Auth & Credential Safety]]
- [[Commercial Readiness Hardening - Cursor Review Auth and CLI Response Safety 2026-05-30]]
