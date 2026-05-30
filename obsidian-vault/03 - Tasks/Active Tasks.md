---
title: Active Tasks
aliases:
  - AgentFeed 다음 작업
  - CLI TODO Board
tags:
  - agentfeed/todo
  - project/tasks
status: active
created: 2026-05-30
---

# Active Tasks

## P0 / 검증

- [x] Review 화면에서 collection quality/source evidence 노출
- [x] Docker 없이 가능한 static gate 보강: `smoke-e2e.sh` syntax + Alembic offline migration chain
- [x] Docker daemon 실행 후 `agentfeed-dev`에서 `make smoke-e2e` 성공 경로 확인
- [x] CLI → Backend → Frontend review/publish/feed smoke 재확인
- [x] Ingestion token `/v1/ingest/status` preflight가 포함된 smoke 재확인
- [x] Live smoke가 production-safe backend config와 충돌하지 않도록 Compose dev env/readiness/hash-session 계약 보강

## P1 후보

- [x] `share --note`를 Backend 별도 필드로 승격할지 API 계약 결정
- [x] review URL clipboard Linux fallback(`wl-copy`, `xsel`) 보강
- [x] 실제 Codex session schema 기반 tool call / subagent / agent turn 과소집계 보강
- [x] 실제 Claude/Gemini session schema 기반 turn / skill / Task subagent 과소집계 보강
- [x] `.obsidian` / `.DS_Store` 로컬 런타임 파일 수집 노이즈 제거
- [x] explicit `--session-file`이 다른 project 로그일 때 metrics 혼입 방지
- [x] 하위 디렉터리 실행 시 relative `--session-file` 경로 오해석 방지
- [x] Codex/OMX session id 불일치 metrics 오염 방지
- [x] generic/Cursor 증분 window에서 timestamp 없는 row 반복 집계 방지
- [x] Codex mixed patch evidence에서 fallback-only changed file 누락 방지
- [x] wrapped test command(`uv run pytest`, `python -m pytest`, `make test`) 과소집계 방지
- [x] generic/Cursor metadata timestamp alias 증분 window 누락 방지
- [x] staged diff / untracked text file git line stats 누락 방지
- [x] explicit `--session-file` source sniff가 agent config disabled 상태에도 동작
- [x] Codex `turn_context.payload.model` 기반 model 누락 방지
- [x] Claude `TaskCreate` todo planning을 subagent로 과대집계하지 않도록 보정
- [x] Gemini failed `activate_skill` / `invoke_agent`를 성공한 skill/subagent로 과대집계하지 않도록 보정
- [x] Gemini failed `write_file` / `replace`를 changed file evidence로 과대집계하지 않도록 보정
- [x] Claude failed `Write` / `Edit` / `MultiEdit`를 changed file evidence로 과대집계하지 않도록 보정
- [x] 성공한 test summary의 `0 failed` 문구를 failed command로 과대집계하지 않도록 보정
- [x] `playwright install`, `cypress open` 같은 browser test setup command와 wrapped setup command를 executed test로 과대집계하지 않도록 보정
- [x] 실패한 Codex `apply_patch` custom tool input을 changed file evidence로 과대집계하지 않도록 보정
- [x] 실패한 Codex `spawn_agent` function call을 spawned subagent로 과대집계하지 않도록 보정
- [x] explicit collection window에서 timestamp 없는 agent evidence row를 제외하도록 보정
- [x] `share --json` upload output에 smoke 검증용 draft를 포함하도록 계약화
- [x] Docker dev frontend `.next` 캐시를 named volume으로 격리해 smoke flake 방지
- [x] Backend profile/leaderboard streak placeholder를 실제 consecutive-day 계산으로 교체
- [x] Frontend feed time filter가 Backend `time_range` API로 전달되도록 연결
- [x] CLI/package version metadata 단일화로 release drift 방지
- [x] dev bootstrap에서 lockfile 기반 `npm ci`와 `.env` 우선 로딩 사용
- [x] 실제 Cursor workspace/session format 추가 조사 후 parser 품질 상향 가능성 판단
- [x] CLI ingest `worklog.model` → Backend 저장 → Frontend 노출 계약화
- [x] Header 검색창을 `/search` 페이지와 Backend `/search` API에 연결
- [x] Projects/Profile/ProjectDetail cursor pagination UX 보강
- [x] Project slug lookup이 첫 페이지 밖 프로젝트를 false 404 처리하지 않도록 보강
- [x] CLI browser login/token path를 no-OAuth test와 dev smoke token preflight로 검증
- [x] publish/upload 직전 draft public field 재-scan으로 수동 편집 secret 누출 방지
- [x] generic/Cursor `--until` 단독 window에서 timestamp 없는 row 반복 집계 방지
- [x] Backend GitHub provider token plaintext 저장을 encrypted at-rest 저장으로 보정
- [x] Frontend 주요 inert control을 route/API-backed action으로 연결
- [x] Backend production env에서 default secret/local OAuth URL을 fail-fast로 차단
- [x] CLI API base URL을 network call 전에 검증/정규화
- [x] Backend `project_id` malformed UUID를 schema/query validation으로 422 처리
- [x] Landing placeholder footer/comment/share controls를 실제 route/action으로 연결
- [x] CLI login `--no-save`로 token/browser credential file 미저장 경로 보장
- [x] Frontend `NEXT_PUBLIC_API_URL` `/v1` 중복/trailing slash/malformed 설정 방어
- [x] Backend GitHub OAuth state를 signed+cookie-bound로 검증해 login CSRF 방어
- [x] CLI API POST timeout/AbortSignal로 login/publish 무기한 대기 방지
- [x] Soft-deleted user의 ingestion token 인증과 `last_used_at` 갱신 차단
- [x] CLI browser-login exchange 단계에서 soft-deleted user의 신규 token 발급 차단
- [x] Frontend production build에서 `NEXT_PUBLIC_API_URL` 누락 시 localhost bundle 생성 방지
- [x] 수동 worklog 생성이 타인 project UUID에 연결되는 project stats/feed 오염 방지
- [x] CLI credential directory/file POSIX permission을 private mode로 고정
- [x] npm package `prepack` build gate로 stale `dist` 배포 방지
- [x] Backend ingest payload cap을 실제 streamed body byte 기준으로 강제
- [x] Frontend project slug null 시 id fallback으로 dead link 방지
- [x] CLI privacy scanner가 Windows absolute path를 redaction
- [x] CLI `open_review_after_upload` 설정을 publish/share upload UX에 반영
- [x] Private worklog comments list/create visibility gate 보강
- [x] Unlisted publish도 unresolved high severity privacy finding 차단
- [x] GitHub OAuth provider 장애/httpx failure를 raw 500 대신 controlled 503으로 변환
- [x] CLI duplicate ingestion 409 응답의 `review_url`을 성공 재동기화로 처리
- [x] GitHub OAuth state payload 내부 만료 시간 검증
- [x] Private worklog social like/bookmark mutation visibility gate 보강
- [x] CLI Claude hook uninstall이 missing config를 생성하지 않는 no-op 보장
- [x] Frontend worklog comment submit 중복 클릭/실패 UX 보강
- [x] CLI draft id path traversal로 `.agentfeed/credentials.json` read/delete 가능한 P0 차단
- [x] Private worklog comment report mutation visibility gate 보강
- [x] Header GitHub OAuth login이 현재 route/query를 next로 보존
- [x] Public publish 시 follower에게 `new_worklog_from_following` notification 발행

## P2 후보

- [x] 비용 정보는 추정 금지 원칙 유지, explicit cost field만 opt-in 보존
- [x] `doctor` 출력에 source별 개선 가이드 더 구체화
- [x] privacy redaction dry-run 상세 표시
- [x] Public Feed sort 라벨 `Most shipped` → `Most discussed` 계약 정리
- [x] Backend unpublish endpoint를 Frontend review/detail 관리 UX에 연결
- [x] Frontend unpublish control을 실제 published status 기준으로 축소

## 관련 링크

- [[CLI Product Improvements Roadmap#남은 P1 후보]]
- [[Collection System#체크포인트]]
- [[Collection System#Doctor 진단 UX]]
- [[Collection System#비용 수집 정책]]
- [[Privacy Safety#Redaction dry-run UX]]
- [[Integration - CLI Backend Frontend#2026-05-30 Review evidence 계약]]
- [[Integration - CLI Backend Frontend#남은 검증 리스크]]
- [[Integration - CLI Backend Frontend#2026-05-30 Clipboard fallback 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 user_note 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 E2E smoke gate 보강]]
- [[Integration - CLI Backend Frontend#2026-05-30 Docker smoke E2E 성공]]
- [[Integration - CLI Backend Frontend#2026-05-30 share --json upload draft 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 Feed time_range 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 Leaderboard streak 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 Release/dev reproducibility 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 test-all gate 보강]]
- [[Integration - CLI Backend Frontend#2026-05-30 worklog.model ingest 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 Search UI/API 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 Cursor pagination UX 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI login/token smoke 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 Feed sort label 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 Publish management 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 Backend provider token at-rest 보호]]
- [[Integration - CLI Backend Frontend#2026-05-30 Frontend inert control 제거]]
- [[Integration - CLI Backend Frontend#2026-05-30 Backend production env fail-fast]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI API base URL validation]]
- [[Integration - CLI Backend Frontend#2026-05-30 Backend project_id UUID validation]]
- [[Integration - CLI Backend Frontend#2026-05-30 Landing placeholder control 제거]]
- [[Privacy Safety#2026-05-30 Upload-time privacy re-scan]]
- [[Auth & Credential Safety#2026-05-30 CLI ephemeral login --no-save]]
- [[Runtime Configuration#2026-05-30 Frontend API URL normalization]]
- [[Auth & Credential Safety#2026-05-30 GitHub OAuth state CSRF protection]]
- [[Runtime Configuration#2026-05-30 CLI API POST timeout]]
- [[Auth & Credential Safety#2026-05-30 Deleted user ingestion-token invalidation]]
- [[Auth & Credential Safety#2026-05-30 CLI auth exchange active-user gate]]
- [[Runtime Configuration#2026-05-30 Frontend production API env preflight]]
- [[Integration - CLI Backend Frontend#2026-05-30 Worklog project ownership gate]]
- [[Auth & Credential Safety#2026-05-30 CLI credential file permissions]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI credential file permissions]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI npm prepack release gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 Backend streamed ingest payload cap]]
- [[Integration - CLI Backend Frontend#2026-05-30 Frontend project slug fallback]]
- [[Privacy Safety#2026-05-30 Windows path redaction]]
- [[Integration - CLI Backend Frontend#2026-05-30 Windows path redaction]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI open-review config 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 Worklog comment visibility gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 Unlisted publish privacy gate]]
- [[Collection System#2026-05-30 Generic until-window timestamp-less evidence 보정]]
- [[Collection System#2026-05-30 Agent window timestamp-less evidence 보정]]
- [[Collection System#2026-05-30 Codex failed spawn_agent 보정]]
- [[Collection System#2026-05-30 Codex failed apply_patch evidence 보정]]
- [[Collection System#2026-05-30 Browser test setup command 과대집계 보정]]
- [[Collection System#2026-05-30 Test summary zero failed 과대집계 보정]]
- [[Collection System#2026-05-30 Gemini 실패 file edit 과대집계 보정]]
- [[Collection System#2026-05-30 Claude 실패 file edit 과대집계 보정]]
- [[Collection System#2026-05-30 Gemini 실패 skill/subagent 과대집계 보정]]
- [[Collection System#2026-05-30 Claude TaskCreate subagent 과대집계 보정]]
- [[Collection System#2026-05-30 Codex turn_context model 수집]]
- [[Collection System#2026-05-30 Explicit session-file source sniff]]
- [[Collection System#2026-05-30 Git evidence 라인 카운트 보강]]
- [[Collection System#2026-05-30 Collection hardening pass]]
- [[Collection System#2026-05-30 Session file project guard]]
- [[Collection System#2026-05-30 Local runtime noise 필터]]
- [[Collection System#2026-05-30 Claude/Gemini turn metrics 보강]]
- [[Collection System#2026-05-30 Codex tool metrics 보강]]
- [[Collection System#2026-05-30 Codex mixed patch evidence 보강]]
- [[Collection System#2026-05-30 Wrapped test command 인식 보강]]
- [[Collection System#2026-05-30 Generic timestamp alias 보강]]
- [[Collection System#2026-05-30 Cursor 실제 저장소 조사]]
- [[Integration - CLI Backend Frontend#2026-05-30 GitHub OAuth provider failure contract]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI duplicate ingest 409 재동기화]]
- [[Integration - CLI Backend Frontend#2026-05-30 Frontend unpublish control predicate]]
- [[Integration - CLI Backend Frontend#2026-05-30 OAuth state payload expiry]]
- [[Auth & Credential Safety#2026-05-30 OAuth state payload expiry]]
- [[Integration - CLI Backend Frontend#2026-05-30 Social mutation visibility gate]]
- [[Privacy Safety#2026-05-30 Social mutation visibility gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI hook uninstall no-op]]
- [[Integration - CLI Backend Frontend#2026-05-30 Frontend comment submit lock]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI draft id path safety]]
- [[Privacy Safety#2026-05-30 CLI draft id path safety]]
- [[Integration - CLI Backend Frontend#2026-05-30 Private comment report visibility gate]]
- [[Privacy Safety#2026-05-30 Private comment report visibility gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 Header OAuth next preservation]]
- [[Auth & Credential Safety#2026-05-30 Header OAuth next preservation]]
- [[Integration - CLI Backend Frontend#2026-05-30 Publish follower notification producer]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI integration test build lock]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI git-only duplicate test isolation]]
- [x] Public surfaces가 `visibility=public`만으로 needs_review worklog를 노출하지 않도록 published-status gate 보강
- [x] Frontend adapter에서 nullable array API payload 렌더 크래시 방지
- [[Integration - CLI Backend Frontend#2026-05-30 Public surface published-status gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 Frontend nullable array adapter hardening]]
- [[Privacy Safety#2026-05-30 Public surface published-status gate]]
- [x] Backend `allow_comments=false` 설정이 comment create API에서 실제 차단되도록 보강
- [x] Frontend like/bookmark mutation 중복 클릭 pending lock 보강
- [[Integration - CLI Backend Frontend#2026-05-30 Comment settings enforcement]]
- [[Integration - CLI Backend Frontend#2026-05-30 Frontend social mutation pending lock]]
- [[Privacy Safety#2026-05-30 Comment settings enforcement]]
- [[Integration - CLI Backend Frontend#2026-05-30 Soft-deleted project metadata gate]]
- [[Privacy Safety#2026-05-30 Soft-deleted project metadata gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 Backend critical path rate-limit]]
- [[Auth & Credential Safety#2026-05-30 Backend critical path rate-limit]]
- [[Live E2E Smoke Gate Hardening 2026-05-30]]
- [[Integration - CLI Backend Frontend#2026-05-30 Live E2E smoke gate hardening]]

## 새로 발견한 P1 후보 / 다음 루프


- [x] Worklog list/card `viewer_state.can_comment` false default를 Backend permission helper 기준으로 보정
- [x] Public card anonymous like/bookmark click이 API mutation 전에 GitHub OAuth로 이동하도록 보강
- [x] Worklog/project/privacy-finding/publish mutation rate-limit coverage 보강
- [x] `agentfeed share --dry-run`이 configured project commands를 실행하지 않도록 보강
- [[Commercial Readiness Hardening - Card Capabilities Rate Limits and Dry Run Safety 2026-05-30]]
- [[Commercial Readiness Hardening - Token Expiry Provenance and Feed UX 2026-05-30]]

### 다음 하드닝 후보

- [x] Backend `/v1/ingest/status` token lifecycle metadata response model 보강
- [x] CLI `login`/`status`/`doctor` token expiry 저장/표시/임박 경고 보강
- [x] Frontend signed-in `/settings` token/integration/settings surface 추가
- [[Commercial Readiness Hardening - Token Lifecycle and Settings Surface 2026-05-30]]

- [x] Backend ingestion token expiry / invalidation policy와 migration 설계
- [x] Frontend share failure toast/error feedback
- [x] Frontend feed filter URL sync
- [x] CLI repo `.env` unsafe API discovery diagnostic
- [x] CLI credential source provenance를 `status` / `doctor`에 표시


- [x] Backend GitHub OAuth provider identity unique constraint와 deleted-user fail-closed 보강
- [x] Backend CLI auth approve/exchange row lock으로 one-session multi-token race window 축소
- [x] Backend legacy provider token touch-time encryption rotation path 추가
- [x] Backend shared DB rate-limit event global retention pruning 추가
- [x] Frontend `/cli/authorize` missing-session server fallback과 dev smoke assertion 추가
- [x] Backend integration guide CLI install command를 `agentfeed-cli`로 정합화
- [x] Backend auth account duplicate/legacy-token maintenance dry-run 도구 추가
- [x] Dev live smoke가 review/feed rendered shell까지 검증하도록 확장
- [[Commercial Readiness Hardening - Auth Maintenance and Rendered Smoke 2026-05-30]]
- [x] Backend ingestion token 발급 quota/rate-limit/active-user lock 보강
- [x] Backend production API docs 비활성화, tags search-indexing privacy gate, malformed JWT sub 방어
- [x] Frontend WorklogCardA comment/share inert control 제거
- [[Commercial Readiness Hardening - Token Quotas Privacy Tags and Card Actions 2026-05-30]]
- [x] Backend `viewer_state.can_comment`와 Frontend Worklog detail composer permission gating 보강
- [x] Frontend persisted theme bootstrap으로 SSR/client theme mismatch window 축소
- [[Commercial Readiness Hardening - Comment Capability and Theme Hydration 2026-05-30]]
- [[Commercial Readiness Hardening - Auth Race and Login Smoke 2026-05-30]]


- [x] CLI npm package collision 회피: package `agentfeed-cli`, bin `agentfeed` 계약화
- [x] CLI `npm pack --dry-run` release gate와 stale dist/test artifact 방지
- [x] CLI reused draft stdout/upload 전 public field 재-scan/redaction 보강
- [x] CLI repo-local `.env` API base auto-discovery를 loopback dev URL로 제한
- [x] Frontend production API URL localhost/http fail-closed와 OAuth next allowlist 보강
- [x] Frontend public login entrypoint/header mount와 Landing OAuth CTA 연결
- [x] Frontend publish privacy severity를 high/critical/unknown fail-closed로 보강
- [x] Backend project visibility를 schema/public surface/direct lookup에서 fail-closed 처리
- [x] Backend `uv.lock`/dev dependency group과 locked test gate 도입
- [x] `agentfeed-dev/scripts/test-all.sh`에 CLI pack dry-run, production-safe frontend build, Backend locked gate 반영
- [[Commercial Readiness Hardening - Release and Public Gates 2026-05-30]]


- [x] 2026-05-30 상용화 readiness 병렬 audit 결과를 [[Commercial Readiness Audit 2026-05-30]]에 정리
- [x] CLI credential/API base trust boundary, token/path/repository redaction, upload response validation 보강
- [x] Backend bookmark/search/public source/privacy scan exposure boundary 보강
- [x] Frontend safe API error, anti-clickjacking headers, production HTTPS API URL gate, review preview/project detail 계약 보강
- [x] Backend trusted proxy 기반 rate-limit identity 보강
- [x] Backend shared limiter store 설계/구현
- [x] Backend production ENV fail-closed 정책 보강
- [x] Frontend Next/PostCSS moderate audit advisory를 PostCSS override와 audit gate로 보정
- [x] `agentfeed-dev/scripts/test-all.sh`에 CLI/Frontend `npm audit --omit=dev --audit-level=moderate` gate 추가
- [x] `agentfeed-dev/scripts/smoke-e2e.sh`를 실제 dev stack 기준 live E2E gate로 안정화
- [x] Backend repo-wide `ruff check .` cleanup 및 FastAPI B008 project ignore 명시
- [x] `agentfeed-dev/scripts/test-all.sh`에 Backend repo-wide `ruff check .` gate 추가

- [x] Backend auth/ingest/social/comment critical path에 최소 per-IP/per-user rate limit 연결
- [x] Soft-deleted project가 public worklog card/detail/search/feed/explore에 metadata로 노출되지 않도록 shared project fetch helper 적용
- [x] `show_token_usage_publicly`, `show_estimated_cost_publicly`, file/line/test metric privacy setting을 public card/detail/stats 응답에 적용
- [x] Frontend OAuth `next` query allowlist와 runtime API config failure UI 보강
- [[Integration - CLI Backend Frontend#2026-05-30 Frontend OAuth next allowlist + runtime API config UI]]
- [[Auth & Credential Safety#2026-05-30 Frontend OAuth next allowlist]]
- [[Runtime Configuration#2026-05-30 Runtime API config failure UI]]
- [[Integration - CLI Backend Frontend#2026-05-30 Public metric privacy settings]]
- [[Privacy Safety#2026-05-30 Public metric privacy settings]]
