---
title: Commercial Readiness Hardening - Soft Delete Auth Intent and CLI Upload Safety 2026-05-30
aliases:
  - Soft Delete Auth Intent CLI Upload Safety
  - 2026-05-30 P1 Soft Delete Auth CLI Upload
created: 2026-05-30
tags:
  - agentfeed/readiness
  - agentfeed/backend
  - agentfeed/cli
  - agentfeed/frontend
  - agentfeed/privacy
  - project/tasks
status: completed
---

# Commercial Readiness Hardening - Soft Delete Auth Intent and CLI Upload Safety 2026-05-30

> [!important] 목표
> 병렬 P1 audit에서 확인된 세 가지 상용화 리스크를 닫았습니다: soft-deleted user public surface 누출, signed-out auth intent 손실, CLI repo-local `auto_upload`/preview redaction trust gap.

## 배경

- Backend public discovery surface가 `Worklog.visibility/status`만 확인하고 author/owner의 `users.deleted_at`을 일관되게 확인하지 않아 삭제 계정의 feed/search/explore/project/worklog detail 노출 가능성이 있었습니다.
- Frontend protected routes(`/dashboard`, `/notifications`, `/settings`)는 signed-out 사용자를 `/`로 보내 OAuth return intent를 잃었습니다. Worklog comment composer도 signed-out CTA가 실제 auth flow와 연결되지 않았습니다.
- CLI `collect`는 repo-local `.agentfeed/config.json`의 `collection.auto_upload=true`를 신뢰해 explicit `--upload` 없이 network upload를 시도할 수 있었습니다. 또한 `preview --json`과 이미 업로드된 draft의 `publish` shortcut은 수동 편집 secret을 다시 scan하지 않는 경로가 있었습니다.

## 구현 요약

### Backend

- Feed/following feed query에 active author join을 추가했습니다.
- Project list/detail/worklogs query에 active owner/author filter를 추가했습니다.
- Search worklogs/projects/prompts/suggestions와 Explore trending/categories/prompts/projects에 `users.deleted_at IS NULL` gate를 추가했습니다.
- Worklog detail은 author가 soft-deleted면 `Worklog not found`로 fail-closed 처리합니다.
- Worklog card project metadata와 public project stats도 active project owner/author 기준으로 계산합니다.

### Frontend

- `authActionIntentForState`와 `commentIntentForAuthState`를 추가해 auth-gated action 의도를 공통화했습니다.
- Dashboard/Notifications/Settings signed-out redirect를 `/` fallback이 아니라 `redirectToSignInForCurrentRoute()`로 변경했습니다.
- Worklog comment composer는 signed-out 상태에서 `GitHub로 로그인` 버튼으로 OAuth flow에 진입하고, loading/disabled/submit 상태를 명시적으로 분리합니다.

### CLI

- `agentfeed collect`는 이제 `collection.auto_upload`를 upload trigger로 사용하지 않습니다. Upload는 `--upload` 명시 시에만 실행됩니다.
- `collection.auto_upload=true`가 감지되면 non-JSON 출력에서 안전 안내를 보여줍니다.
- `agentfeed preview --json`과 remote preview 전 draft public fields를 다시 scan/redact하고 저장합니다.
- `publishDraft`는 이미 업로드된 draft를 재사용하는 shortcut에서도 먼저 re-scan/redact 후 저장합니다.

> [!warning] Trust boundary
> `.agentfeed/config.json`은 repo-local 파일이므로 cloned repo에서 network side effect를 자동 유발하면 안 됩니다. `collect --upload`만 upload side effect를 허용하는 기준입니다.

## 검증 결과

> [!success] Gate 통과
> 세 레포 targeted/full gate와 `agentfeed-dev make test`가 모두 통과했습니다.

- Backend targeted: `uv run ruff check app/routers/feed.py app/routers/projects.py app/routers/search.py app/routers/explore.py app/routers/worklogs.py app/services/project.py tests/test_contracts.py && uv run pytest -q tests/test_contracts.py -k 'soft_deleted or worklog_detail_rejects_soft_deleted_author or keyset_list_endpoints or search_worklogs_respects_author_search_indexing_setting or search_prompts_respects_author_search_indexing_setting or search_suggestions_exclude_disabled_authors_and_owners'` → 11 passed
- Backend full: `uv run ruff check . && uv run python -m compileall app && uv run pytest -q` → 145 passed
- CLI targeted: `npm run typecheck && npm run test -- tests/api-hook.test.ts tests/cli-collect.test.ts tests/cli-preview.test.ts` → 39 passed
- CLI full: `npm run typecheck && npm test -- --run && npm run build` → 177 passed
- Frontend targeted: `npm run test:contracts && npm run lint` → passed
- Frontend production build: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` → passed
- Integration: `make test` in `agentfeed-dev` → passed, including CLI `prepack`, frontend build, backend ruff/pytest, Alembic offline migration chain

> [!note] Build env evidence
> Frontend production build intentionally rejects missing or localhost `NEXT_PUBLIC_API_URL`. Localhost build failure is expected guard behavior; production URL build passed.

## 계약

- Public feed/search/explore/project/worklog detail surfaces must exclude soft-deleted authors and project owners.
- Protected frontend routes preserve the current route as OAuth `next` instead of falling back to `/`.
- Comment creation intent is `wait | sign_in | disabled | submit`; signed-out users must enter auth, not a dead disabled state.
- CLI `collect` upload side effect requires explicit `--upload`.
- CLI preview/publish shortcut paths must re-run public-field redaction before rendering, previewing remotely, or returning an existing upload result.

## 남은 리스크 / 다음 후보

- Backend social/report write endpoints still need stronger spam/rate-limit policy review beyond current critical-path coverage.
- CLI upload retry/backoff and resumable network recovery remain P2 resilience candidates.
- Frontend external repository/homepage links should get a dedicated URL sanitizer helper before broader public launch.

## 관련 링크

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[Privacy Safety]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Commercial Readiness Hardening - Unpublish Command Trust and Feed Follow Auth 2026-05-30]]
