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
- [x] CLI configured command shell wrapper를 거부해 `--run-configured-commands` trust boundary 축소
- [x] CLI configured command 실행 env에서 sensitive token/credential scrub
- [x] CLI literal `login --token <token>`을 기본 비활성화하고 stdin-first 경로로 고정
- [x] Backend invalid/random Bearer header rate-limit bypass 차단
- [x] Backend ingested privacy finding pre-resolved publish bypass 차단
- [x] Frontend Settings privacy/default visibility controls 노출
- [x] Dashboard recent worklogs link를 status-aware review/public action으로 분기
- [x] Backend ingestion `project.repository_url`이 public URL validator를 우회하지 않도록 보강
- [x] CLI `agentfeed login --token` argv/history 노출을 stdin-first token 입력으로 보강
- [x] Project public link/detail을 owner-aware route로 전환해 slug collision/false 404 방지
- [x] smoke-e2e가 owner-only user_note public 비노출 계약을 검증하도록 수정
- [x] Backend/Frontend publish privacy severity taxonomy를 fail-closed 기준으로 정렬
- [x] Backend review privacy_scan_json stale override 제거
- [x] smoke-e2e가 CLI auth exchanged token과 privacy block/resolve/publish success를 검증하도록 보강
- [x] smoke-e2e가 hydrated browser public DOM에서 user_note 비노출을 검증하도록 보강
- [x] Alembic 긴 revision id가 dev/live migration을 깨지 않도록 version table 확장
- [x] CLI private review upload와 public/unlisted publish privacy gate 혼동 방지
- [x] CLI draft JSON/Markdown artifact를 private permission(`0o600`)으로 저장

- [x] Backend aggregate feed sort offset cursor를 score/published_at/id keyset cursor로 교체
- [x] Frontend GitHub OAuth next redirect safe hash fragment 보존 및 unsafe hash strip
- [x] Frontend Docs CLI quick start의 제거된 `share --upload` 안내 수정

- [x] CLI Windows browser opener + `agentfeed open` trusted review URL regression 보강
- [x] Backend `API_ALLOWED_HOSTS` / `TRUSTED_PROXY_IPS` startup validation 보강
- [x] Frontend SettingsPage integrations/token section-level failure isolation 보강

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
- [x] Explore popular tag 링크와 Feed `tag` filter 계약 연결
- [x] Worklog card author static mock user fallback 제거
- [x] Landing hero preview static demo worklog 제거 및 API-backed 전환
- [x] CLI/package version metadata 단일화로 release drift 방지
- [x] CLI npm package launch metadata와 README install state 정렬
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

- [x] Backend public feed/search/explore/projects/worklog detail에서 soft-deleted author/owner 누출 차단
- [x] Frontend dashboard/notifications/settings/comment signed-out intent를 OAuth next로 보존
- [x] CLI `collect` repo-local `collection.auto_upload` 무시 및 preview/publish 재-redaction 보강


- [x] CLI authenticated requests가 repo-local `.env` API base를 기본 신뢰하지 않도록 opt-in gate 추가
- [x] CLI cached draft `review_url` 재검증 및 `agentfeed open` browser opener trust gate 보강
- [x] Backend public discovery/search/read endpoints read-tier rate-limit 및 bounded search query 보강
- [x] Backend profile/project public URL field http(s)/host/userinfo validation 보강
- [x] Backend follow/like/bookmark idempotent race handling 및 self-follow DB constraint 보강
- [x] Frontend feed/search/explore/profile/project list adapter malformed row isolation 보강

- [x] CLI CI/browser login guard를 일반 CI env까지 확장
- [x] CLI `--json` publish/share clipboard side effect를 explicit `--clipboard` opt-in으로 전환
- [x] CLI flag-like option value와 non-HTTP Git remote upload 누출 방지
- [x] Backend authenticated/read helper route rate-limit coverage와 static path normalization 보강
- [x] Backend public URL private host 차단과 search wildcard escaping 보강
- [x] Frontend nonce 기반 CSP, auth outage redirect loop 방지, GET Content-Type 제거

- [x] CLI privacy scanner가 npm/Slack/PEM/secret assignment 패턴을 redaction
- [x] CLI browser-login polling timeout UX와 CI auto-open side effect 보강
- [x] CLI npm package bin executable mode를 postbuild/prepack에서 보장
- [x] Backend browser JWT logout revocation cutoff 추가
- [x] Backend integrations/profile-project/review/me-token route rate-limit coverage 보강
- [x] Frontend auth outage review/header UX, CSP fallback, search load-more dedup 보강

- [x] CLI optional OS keychain credential backend 및 status/doctor provenance 보강
- [x] Backend publish follower notification race를 row lock/transition edge로 보강
- [x] Backend leaderboard following-state N+1 제거 및 public worklog partial index 추가
- [x] Frontend profile/project/explore pagination/partial-failure contract regression 보강
- [x] CLI oversized/pathological agent session transcript bounded parsing guard 보강
- [x] Backend notification producer idempotency를 `dedupe_key` unique insert로 보강
- [x] Frontend dashboard/worklog comments/API pagination contract regression 보강
- [x] CLI native macOS keychain opt-in smoke 추가 및 로컬 round-trip 검증
- [x] Backend notification settings gate + dedupe insert ordering regression 보강
- [x] Frontend optimistic social action pure helper + contract regression 보강
- [x] Backend notification dedupe migration online concurrent index + offline SQL compatibility 보강
- [x] CLI browser login no-open/no-save credential-free smoke + CI no-session guard regression 보강
- [x] Frontend Header nav/search pure helper + active route boundary contract 보강

- [x] Backend user/me/dashboard/worklog detail·review·publish route response_model 계약 고정

- [x] CLI `collect --json` raw draft root 계약 문서화 및 회귀 테스트 고정

- [x] Backend JSON API route response_model coverage를 redirect/deprecated 예외 외 전체로 확장
- [x] `agentfeed-dev make test`에 cross-repo OpenAPI client contract gate 추가

- [x] Frontend comment/worklog report actions를 Backend report API에 연결할지 제품 결정 후 구현
- [x] Frontend profile edit / username update surface를 Backend `/me/profile`, `/me/username` 계약에 연결
- [x] Frontend project create/edit/delete 관리 surface를 Backend project mutation API에 연결
- [x] Backend/Frontend project edit nullable field clear semantics를 explicit null PATCH 계약으로 정렬
- [x] dev smoke-e2e가 project PATCH omitted-vs-null clear와 hydrated detail DOM을 검증하도록 보강
- [x] Frontend public activity tab을 Backend `/users/{username}/activity`에 연결

## P2 후보

- [x] Backend/CLI token-authenticated ingestion token self-rotation 차단 및 browser-approved replacement 전환
- [x] CLI stale self-rotation helper/test 제거 및 Backend OpenAPI deprecated 403 계약화
- [x] Frontend leaderboard malformed row isolation으로 public ranking crash 방지
- [x] Backend profile `viewer_state.following` + Frontend follow hydration/own-profile suppression 보강
- [x] CLI privacy scanner authorization header/credentialed URL/private IPv6 redaction 보강
- [x] Frontend Settings token-management UI에서 named ingestion token create/one-time reveal 지원
- [x] 비용 정보는 추정 금지 원칙 유지, explicit cost field만 opt-in 보존
- [x] `doctor` 출력에 source별 개선 가이드 더 구체화
- [x] privacy redaction dry-run 상세 표시
- [x] Public Feed sort 라벨 `Most shipped` → `Most discussed` 계약 정리
- [x] Backend unpublish endpoint를 Frontend review/detail 관리 UX에 연결
- [x] Frontend unpublish control을 실제 published status 기준으로 축소

## 관련 링크

- [[Commercial Readiness Hardening - Landing API Backed Preview 2026-06-01]]

- [[Commercial Readiness Hardening - Worklog Author Mock Fallback Removal 2026-06-01]]

- [[Commercial Readiness Hardening - Feed Tag Filter Contract 2026-06-01]]

- [[Commercial Readiness Hardening - CLI NPM Package Metadata 2026-06-01]]

- [[Commercial Readiness Hardening - Project Clear Smoke Gate 2026-06-01]]

- [[Commercial Readiness Hardening - Project Nullable Field Clear Semantics 2026-06-01]]

- [[Commercial Readiness Hardening - Project Mutation Surface 2026-06-01]]

- [[Commercial Readiness Hardening - Public Activity Tab 2026-06-01]]

- [[Commercial Readiness Hardening - Report Actions Surface 2026-06-01]]

- [[Commercial Readiness Hardening - Profile Username Settings Surface 2026-05-31]]

- [[Commercial Readiness Hardening - Cross Repo OpenAPI Contract Gate 2026-05-31]]

- [[Commercial Readiness Hardening - Rate Limit Fallback Detail Payload Resilience and Credential Fallback Warning 2026-05-31]]


- [[Commercial Readiness Hardening - OAuth Cookie Scope JSON Upload and Signout State 2026-05-31]]


- [[Commercial Readiness Hardening - Browser Approved Token Rotation 2026-05-31]]
- [[Commercial Readiness Hardening - Profile Follow Hydration and Leaderboard Resilience 2026-05-31]]
- [[Commercial Readiness Hardening - Rate Limit and Privacy Finding Ownership 2026-05-31]]
- [[Commercial Readiness Hardening - Settings Privacy Controls 2026-05-31]]
- [[Commercial Readiness Hardening - CLI Privacy Scanner Header and URL Redaction 2026-05-31]]
- [[Commercial Readiness Hardening - CLI Command and Token Trust Boundary 2026-05-31]]
- [[Commercial Readiness Audit Followups 2026-05-31]]

- [[Commercial Readiness Hardening - Ingest Repository URL Safety 2026-05-31]]

- [[Commercial Readiness Hardening - CLI Token Stdin Login 2026-05-31]]

- [[Commercial Readiness Hardening - Dashboard Recent Worklog Actions 2026-05-31]]

- [[Commercial Readiness Hardening - Settings Named Token Creation 2026-05-31]]

- [[Commercial Readiness Hardening - Owner Aware Project Routes 2026-05-31]]

- [[Commercial Readiness Hardening - CLI Draft Artifact Permissions 2026-05-31]]

- [[Commercial Readiness Hardening - Hydrated Browser Privacy Smoke 2026-05-31]]

- [[Commercial Readiness Hardening - Publish Privacy Severity Auth Smoke and Alembic Version Gate 2026-05-31]]

- [[Commercial Readiness Hardening - Feed Keyset and OAuth Hash Redirect 2026-05-31]]

- [[Commercial Readiness Hardening - Cross Platform Open Config Validation and Settings Partial Failure 2026-05-31]]

- [[Commercial Readiness Hardening - Native Keychain Smoke Notification Gates and Social Action Contracts 2026-05-31]]
- [[Commercial Readiness Hardening - Concurrent Notification Migration CLI Auth Smoke and Header Contracts 2026-05-31]]
- [[Commercial Readiness Hardening - Session Parser Bounds Notification Dedupe and Comment Contracts 2026-05-31]]
- [[Commercial Readiness Hardening - Keychain Publish Race Leaderboard Scale and Frontend Contracts 2026-05-31]]

- [[Commercial Readiness Hardening - Soft Delete Auth Intent and CLI Upload Safety 2026-05-30]]
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


- [[Commercial Readiness Hardening - Discovery Rate Limits URL Safety and Adapter Resilience 2026-05-31]]
- [[Integration - CLI Backend Frontend#2026-05-31 Discovery URL Adapter hardening]]
- [[Auth & Credential Safety#2026-05-31 CLI repo-local API trust gate]]
- [[Privacy Safety#2026-05-31 Public URL field validation]]
- [[Runtime Configuration#2026-05-31 Public discovery rate-limit contract]]

## 새로 발견한 P1 후보 / 다음 루프


- [x] Cookie-authenticated browser mutation Origin/Referer gate 보강
- [x] CLI transient upload retry/backoff 및 remote cleartext API token 전송 차단
- [x] CLI browser-login authorize URL trust boundary 검증
- [x] Backend published worklog post-privacy-gate in-place edit 차단
- [x] Backend notification mutation rate-limit 실제 route 정합성 보강
- [x] Backend public comments soft-deleted author filter 보강
- [x] Frontend dynamic route segment encoding 및 project repo URL sanitizer 보강
- [[Commercial Readiness Hardening - Retry Trust Boundary and Route Safety 2026-05-30]]
- [x] Settings rotated token one-time copy/reveal/auto-clear UX 보강
- [x] Backend `/v1/search` cursor/has_more 계약과 Frontend Load more 연결
- [x] CLI invalid token upload recovery 안내를 `agentfeed rotate` 중심으로 보정
- [x] Backend keyset cursor malformed payload 500 방지
- [x] `/users/{username}/projects` cursor pagination과 Frontend profile projects Load more 연결
- [x] Backend `/unpublish` public 재전환/privacy gate 우회 방지
- [x] CLI repo-local configured command 실행을 `--run-configured-commands` 명시 opt-in으로 전환
- [x] Frontend Feed Rising builders Follow signed-out CTA를 OAuth auth funnel로 연결
- [x] Frontend review route/profile follow auth gate 보강
- [x] CLI upload response visibility/review URL 검증과 malformed credentials recovery 보강
- [[Commercial Readiness Hardening - CSRF Token Capture and Search Pagination 2026-05-30]]
- [[Commercial Readiness Hardening - Cursor Review Auth and CLI Response Safety 2026-05-30]]


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
- [x] Backend/CLI/Frontend ingestion token rotation UX 추가
- [[Commercial Readiness Hardening - Token Lifecycle and Settings Surface 2026-05-30]]
- [[Commercial Readiness Hardening - Token Rotation UX 2026-05-30]]

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

## 2026-05-30 P1 hardening follow-up

- [x] Backend `/v1/leaderboard` cursor pagination과 global rank metadata를 Frontend Load more UX에 연결
- [x] Project active `(owner_id, slug)` partial unique index와 Backend race retry path 추가
- [x] CLI `AGENTFEED_TOKEN` rotation 실패 안내를 shell/secret manager remediation 중심으로 보강
- [[Commercial Readiness Hardening - Leaderboard Pagination Slug Uniqueness Env Token UX 2026-05-30]]
- [[Commercial Readiness Hardening - Unpublish Command Trust and Feed Follow Auth 2026-05-30]]

## 2026-05-31 P1 hardening continuation

- [x] CLI browser opener hang 시 authorize URL 선출력 및 timeout fallback 보강
- [x] CLI `publish --json` machine-readable output과 publish clipboard parity 보강
- [x] Frontend malformed successful API response를 safe `ApiError`로 변환
- [x] Frontend 401 API response auth-error event와 signed-out state recovery 보강
- [x] Frontend security header contract 확장
- [x] Backend `team` project visibility MVP schema 제거 및 visibility/status DB check constraint 보강
- [x] Backend username/profile/project/worklog/ingest request bound validation 보강
- [x] Backend public/list pagination limit lower-bound validation 보강
- [[Commercial Readiness Hardening - Browser Login API Bounds and Security Headers 2026-05-31]]

## 2026-05-31 host token race private preview continuation

- [x] CLI Claude Code Stop hook failure를 `.agentfeed/logs/hook.log`에 기록하고 hook exit `0`으로 격리
- [x] CLI browser login/rotate pre-auth 단계에서 repo-local `.env` API base를 기본 ignore하고 explicit trust flag로만 허용
- [x] Backend `API_ALLOWED_HOSTS` + `TrustedHostMiddleware` production Host header allowlist 추가
- [x] Backend ingestion token 발급 user lock + quota check를 서비스 경계로 통합
- [x] Backend public worklog card/detail에서 owner-only `user_note` 제거
- [x] Backend review preview에서 `user_note`를 private field로 명시하고 safe preview contract 추가
- [x] Frontend public adapter에서 `user_note` 제거 및 unsafe preview publish guard 추가
- [[Commercial Readiness Hardening - Host Token Race and Private Preview Guards 2026-05-31]]

## 2026-05-31 auth validation pagination CSP continuation

- [x] CLI browser auth exchange / token rotation response runtime validation 추가
- [x] CLI malformed auth/rotation response가 credentials를 덮어쓰지 않는 regression test 추가
- [x] CLI `AGENTFEED_CI` browser login fail-fast guard와 `--browser` override 추가
- [x] CLI Discord bot token-like secret redaction coverage 추가
- [x] Frontend feed cursor pagination + Load more UX 추가
- [x] Frontend worklog comments cursor pagination + Load more comments UX 추가
- [x] Frontend CSP directive contract 확장
- [x] Frontend route/global branded error boundary 추가
- [x] Backend Bearer+cookie mutation도 CSRF Origin gate를 우회하지 않도록 계약 테스트 고정
- [[Commercial Readiness Hardening - Auth Validation Pagination CSP and CSRF Contract 2026-05-31]]
- [[Commercial Readiness Hardening - CI Automation CSP Auth Recovery Rate Limits and Search Safety 2026-05-31]]
- [[Commercial Readiness Hardening - Secret Scanner Session Revocation Frontend Outage UX 2026-05-31]]

## 2026-05-31 payload/report/secondary failure isolation continuation

- [x] CLI Codex `apply_patch` fallback 실패 output 오탐 방지
- [x] Backend mutating request body cap과 user-generated text field cap 추가
- [x] Backend report duplicate idempotency unique constraint + migration 추가
- [x] Backend search suggestions project slug wildcard escape 누락 보강
- [x] Frontend body 없는 POST/DELETE Content-Type 제거로 CORS preflight 축소
- [x] Frontend profile/project/dashboard/explore secondary API failure isolation
- [x] Frontend projects/leaderboard/profile/project/notifications pagination dedup helper 적용
- [[Commercial Readiness Hardening - Payload Caps Report Idempotency Secondary Failure Isolation 2026-05-31]]


## 2026-05-31 auth response/json side-effect continuation

- [x] Backend `/health`, `/v1/auth/me`, `/v1/me/settings*` high-traffic response model first slice 고정
- [x] Backend `AuthMeResponse.location`을 추가해 DB/Backend/Frontend auth profile 계약 정렬
- [x] Frontend `auth.me()` payload 정규화와 AppContext signed-in gate 보강
- [x] CLI `share --json` 기본 no clipboard/browser side effect, explicit opt-in, failure no-side-effect regression 보강
- [[Commercial Readiness Hardening - Auth Identity Response Models and JSON Side Effects 2026-05-31]]


## 2026-05-31 public interaction response model continuation

- [x] Backend `/v1/feed`, `/v1/feed/following`, `/v1/explore/categories/{slug}/worklogs` response model 고정
- [x] Backend `/v1/tags`, `/v1/search/suggestions` discovery response model 고정
- [x] Backend like/bookmark/comment/report interaction response model 고정
- [x] `WorklogCard` schema를 실제 public card payload(`status`, `changed_areas`, `public_prompt`)와 정렬
- [[Commercial Readiness Hardening - Public Interaction Response Models 2026-05-31]]
- [[Commercial Readiness Hardening - User Dashboard Worklog Contracts and Collect JSON Stability 2026-05-31]]
- [[Commercial Readiness Hardening - Full JSON API Response Contract 2026-05-31]]
