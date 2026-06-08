---
title: Active Tasks
aliases:
  - AgentFeed 다음 작업
  - CLI TODO Board
status: active
tags:
  - agentfeed/todo
  - project/tasks
updated: 2026-06-08
---

# Active Tasks

## 현재 결론

로컬/CI/contract/UI/UX 기준 상용화 품질 goal은 **완료**됐다. CLI UX goal도 [[CLI UX Completion Audit 2026-06-06]] 기준으로 완료 판정한다. owner가 새로 정한 다음 방향은 **개인 서버에서 Frontend/Backend를 IP-only로 테스트 구동/운영 준비**하는 것이다.

- 사람이 직접 해야 할 일: [[Human Action Checklist]]
- 서버/env 기준: [[Runtime Configuration]]
- 완료된 대량 hardening 요약: [[Commercial Readiness Completed Summary 2026-06-04]]


> [!success] 2026-06-06 Frontend UI/UX polish goal 완료
> 이전 로컬/CI/contract 상용화 품질 goal은 완료 상태지만, owner가 새로 설정한 Frontend 디자인/UI/UX 완성도 향상 goal은 Stage 1~18 evidence 기준으로 완료 판정한다. Stage 18에서 실제 개인 서버 production stack의 authenticated success-state visual smoke까지 확인했다. Worklog detail/review는 Stage 5, Project/Profile은 Stage 6, Explore/Leaderboard는 Stage 7, Dashboard/Notifications/Moderation은 Stage 8, static/utility pages는 Stage 9, browser visual landmark QA는 Stage 10, Settings token lifecycle UI는 Stage 11, Worklog review publish gate는 Stage 12에서 1차 polish 완료, Profile follow/action feedback은 Stage 13에서 1차 polish 완료, Project detail owner action/edit/delete feedback은 Stage 14에서 1차 polish 완료, Search input/results/empty/loading states는 Stage 15에서 1차 polish 완료, CLI browser approval states는 Stage 16에서 1차 polish 완료, cross-page production visual/DOM QA와 discovery page landmark/production start 회귀는 Stage 17에서 보강 완료, authenticated server production success-state visual smoke와 legacy worklog detail contract 보강은 Stage 18에서 완료. 최종 검증은 backend pytest/ruff, frontend test/lint/build, server production visual smoke 13/13, 서버 fixture cleanup 0건, AgentFeed 잔여 브라우저/Playwright 프로세스 없음으로 닫았다.
> - [[Frontend UI UX Polish Stage 1 2026-06-06]]
> - [[Frontend UI UX Polish Stage 2 2026-06-06]]
> - [[Frontend UI UX Polish Stage 3 2026-06-06]]
> - [[Frontend UI UX Polish Stage 4 2026-06-06]]
> - [[Frontend UI UX Polish Stage 5 2026-06-06]]
> - [[Frontend UI UX Polish Stage 6 2026-06-06]]
> - [[Frontend UI UX Polish Stage 7 2026-06-06]]
> - [[Frontend UI UX Polish Stage 8 2026-06-06]]
> - [[Frontend UI UX Polish Stage 9 2026-06-06]]
> - [[Frontend UI UX Polish Stage 10 2026-06-06]]
> - [[Frontend UI UX Polish Stage 11 2026-06-06]]
> - [[Frontend UI UX Polish Stage 12 2026-06-06]]
> - [[Frontend UI UX Polish Stage 13 2026-06-06]]
> - [[Frontend UI UX Polish Stage 14 2026-06-06]]
> - [[Frontend UI UX Polish Stage 15 2026-06-06]]
> - [[Frontend UI UX Polish Stage 16 2026-06-06]]
> - [[Frontend UI UX Polish Stage 17 2026-06-06]]
> - [[Frontend UI UX Polish Stage 18 2026-06-06]]

> [!success] 2026-06-04 로컬 상용화 품질 evidence
> - CLI `npm run release:preflight`: 통과, 397 tests passed.
> - Frontend local CI: `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run ci` 통과.
> - Backend `pytest`: 388 passed, `ruff check .` 통과, Alembic offline chain 001→027 생성 통과.
> - Dev `make test`: 통과.
> - Dev `make smoke-e2e`: 통과. CLI browser login/session approval → share upload → review API/page → privacy gate → publish → feed/dashboard/settings/sign-out DOM까지 검증.
> - 2026-06-04 추가 UI smoke: desktop/mobile landing/feed/worklog detail snapshot 확인. landing mobile overflow와 worklog detail mobile column collapse 수정 후 재확인.
> - 2026-06-04 추가 Profile/Project smoke: 임시 public profile/project/worklog fixture로 `/profile/downing`, `/projects/downing/smoke-project` 모바일 렌더링 확인 후 fixture 삭제. body/document horizontal overflow 없음.
> - 2026-06-04 추가 Backend regression: legacy string `outcome_json` public detail 500 수정. backend `pytest`: 388 passed.
> - 2026-06-04 push/CI: CLI `9361948`, Backend `286c981`, Frontend `2ec2455`, Dev `8db795e` 푸시 완료. 이후 Obsidian evidence doc commit `45b6ee1`도 푸시/CI 성공.

> [!warning] 도메인 상태
> `agentfeed.dev`는 아직 준비된 도메인이 아니다. 현재 문서/코드의 `agentfeed.dev` 값은 예시 또는 계약 테스트용 placeholder로만 취급한다. 개발 단계에서는 DNS 없이 개인 서버 IP로 테스트한다.

> [!success] 2026-06-06 CLI UX/package smoke evidence
> - CLI help/status/doctor/preview/share/drafts next-action 출력은 좁은 터미널에서도 읽히도록 wrapping/ordering 보강 완료.
> - `agentfeed status`가 `Setup progress: n/5 ready · m need attention` 요약을 출력하고, `status --json`도 같은 summary를 제공한다.
> - `agentfeed doctor`가 Summary 안에서 `Fix first` 우선순위 명령을 보여주고, `doctor --json`도 `priority_actions`를 제공한다.
> - `agentfeed share` / `share --yes`는 token이 없어도 실패하지 않고 local draft preview를 만든 뒤 `upload_skipped`와 login/publish 순서를 안내한다.
> - 모든 public command help surface가 `When to use` 섹션을 포함해 명령 사용 시점을 바로 설명한다.
> - `agentfeed commands`가 `Guided workflows`로 Beginner setup / Daily share / Draft review / Power user / Recovery 흐름을 설명한다.
> - README npm install/onboarding이 `agentfeed commands`, no-token `share` fallback, installed-package first-run preflight 범위를 현재 CLI UX와 일치하도록 최신화됐다.
> - `publish`/upload preflight 실패가 `Fix first` / `Then retry` 구조와 JSON `next_actions`로 `doctor`, `status`, `login`, `rotate`, retry publish 명령을 안내하도록 보강됐다.
> - shell completion audit 완료: zsh/bash/fish가 `--source` 값 후보와 file path 옵션 completion을 제공하고 `commands --json`도 `value_choices`를 노출한다.
> - `npm run build`: 통과.
> - `npx vitest run tests/release-preflight.test.ts --reporter=verbose`: 15 tests passed.
> - `npm run release:preflight`: 26 test files, 533 tests passed.
> - release preflight가 npm tarball 설치 후 실제 installed `agentfeed` binary로 `--help`, `--version`, `init`, `status`, `share --dry`, `drafts` 첫 사용자 플로우를 검증한다.
> - 2026-06-06 최종 CLI UX completion audit: [[CLI UX Completion Audit 2026-06-06]].
> - `npx vitest run tests/cli-help.test.ts tests/cli-status-doctor.test.ts tests/cli-share.test.ts --reporter=verbose`: 3 test files, 128 tests passed.
> - 개인 서버 IP-only `doctor --json`: API ready `yes (200)`, compatibility `v1 / 2026-06-03`, ingestion token valid `yes (200)`.
> - GitHub Actions usage limit 때문에 `main` direct push CI는 quota failure로 step/log 없이 실패할 수 있다. 현재는 CI를 PR/manual scope로 제한하고 direct push 전 로컬 `npm run release:preflight`를 필수 evidence로 본다.

## 완료됨 — 로컬/CI/contract/UI 품질

- [x] CLI subcommand `--help`가 수집/상태파일 작성 side effect 없이 종료되도록 수정.
- [x] CLI 주요 명령 회귀: `release:preflight`로 `login`, `collect`, `share`, `publish`, `open`, `doctor`, `status` 관련 테스트 통과.
- [x] CLI release preflight가 npm tarball 설치 후 첫 사용자 플로우(`init` → `status` → `share --dry` → `drafts`)를 installed binary로 검증하도록 보강.
- [x] `agentfeed status`에 setup progress 요약을 추가해 첫 사용자가 준비 상태와 남은 조치를 한눈에 파악하도록 보강.
- [x] `agentfeed doctor`에 `Fix first` 우선순위 액션을 추가해 여러 진단 실패 시 먼저 고칠 항목을 명확화.
- [x] `agentfeed share`가 token missing 상태에서도 local draft를 생성하고 preview/login/publish 다음 행동을 안내하도록 보강.
- [x] 모든 public command help에 `When to use` 안내를 추가해 명령 선택 부담을 낮춤.
- [x] `agentfeed commands` workflow를 목적 중심 guided workflow로 재구성하고 JSON description 계약 추가.
- [x] README install/quickstart/share/release preflight 문서를 현재 npm 설치 사용자 플로우와 no-token share fallback에 맞게 최신화.
- [x] `publish`/upload preflight 실패 복구 UX를 `Fix first` / `Then retry`와 JSON `next_actions` 중심으로 보강.
- [x] shell completion을 zsh/bash/fish별로 audit하고 `--source` 값 후보, token stdin `-`, file path 옵션 completion, `commands --json` value choices를 보강.
- [x] Frontend signed-out Header가 `/`와 `/feed`를 혼동하지 않도록 Home/Feed nav와 active state 수정.
- [x] Frontend landing/feed/review/profile/project 주요 grid가 모바일에서 고정폭 overflow를 만들지 않도록 responsive layout으로 수정.
- [x] Frontend list response wrapper가 `pagination` 누락/부분 payload에서도 fail-closed 동작하도록 정규화.
- [x] Dev smoke-e2e가 CLI auth `status_token` 계약과 backend browser `session_version` revocation 계약을 반영하도록 수정.
- [x] Dev smoke-e2e 실패 시 browser DOM 로그를 바로 출력하도록 보강.
- [x] Dev smoke-e2e 통과로 CLI/API/Frontend 핵심 end-to-end 흐름 검증.
- [x] Backend public worklog detail이 legacy string outcome rows도 현행 `OutcomeItem` response schema로 normalize하도록 수정.
- [x] Landing mobile `How it works`/`Privacy first` responsive overflow 수정.
- [x] Worklog detail mobile layout이 sidebar 때문에 main column을 0px로 collapse하지 않도록 수정.
- [x] `prefers-reduced-motion` 전역 대응 추가.
- [x] Profile tab strip이 모바일에서 clipping되어 보이지 않도록 wrap 처리.
- [x] Theme bootstrap nonce script의 hydration mismatch 경고를 억제.
- [x] 오래된 `docs/todo/*`와 backend `docs/fixes-required.md`가 현재 TODO로 오해되지 않도록 historical 문서로 표시.
- [x] 개발/테스트 배포 방향을 개인 서버 IP-only로 확정하고 Obsidian handoff 문서에 반영.

## P0 — 다음 실제 작업: 개인 서버 IP-only smoke

상세 체크리스트는 [[Human Action Checklist]]를 기준으로 한다.

- [x] 개인 서버 IP/OS/architecture 확인: SSH alias `trading-bot`, Ubuntu Linux `aarch64`.
- [x] Docker Compose 기반 배포 준비 스크립트 생성.
- [x] 서버 포트 scan 후 충돌 회피 후보 결정: Frontend `13030`, Backend `18080`, Postgres `127.0.0.1:15432`.
- [x] 서버 포트/firewall smoke 범위 확인: Frontend `13030`, Backend `18080`, Postgres는 loopback `15432`.
- [x] sibling repo layout 준비.
- [x] OAuth Client ID/Secret을 `.env.server`에 숨김 입력으로 반영하는 `make server-oauth` helper 준비.
- [ ] Postgres volume/backup 위치 결정.
- [x] Backend/Frontend를 서버에서 구동.
- [x] 로컬 CLI에서 `AGENTFEED_ALLOW_INSECURE_API=1 AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1 agentfeed status` smoke.
- [x] 브라우저에서 `http://161.33.171.81:13030/feed` smoke. Signed-out `/v1/auth/me` 401 resource entry는 public page에서 예상되는 상태.
- [x] CLI login compatibility가 IP-only server-test review/authorize origin을 명시 flag 아래에서 통과하도록 수정.
- [x] CLI → API → Frontend review → public feed E2E를 임시 user/session으로 검증.
- [x] 서버 검증 데이터 reset 완료: users/tokens/worklogs/projects/cli_sessions `0`.

## P1 — 사람이 결정하면 agent가 이어서 할 일

- [ ] 개인 서버 정보 기준으로 `agentfeed-dev` 서버 runbook 작성.
- [x] 서버용 `.env.server`를 실제 IP/port 기준으로 생성하되 git에는 제외.
- [x] server smoke 결과를 Obsidian evidence로 반영: [[Server IP-only Smoke Evidence 2026-06-05]].
- [x] GitHub OAuth App Client ID/Secret을 `.env.server`에 반영할 helper 준비.
- [x] OAuth 이후 CLI approval/product flow smoke 실행. 단, 실제 GitHub credential 입력 자동화는 Playwright cookie 한계 때문에 임시 browser session으로 대체.
- [ ] 실제 사용자 브라우저에서 GitHub credential 입력까지 포함한 live login을 한 번 수행.
- [ ] production domain이 생기면 hosted readiness와 `make commercial-readiness` 재실행.
- [ ] npm package 이름/license/homepage/trusted publishing 정책이 확정되면 release/publish 절차 준비.
- [ ] npm trusted publishing을 실제 public repo/environment와 연결한 뒤, tag 기반 dry release 절차 점검.

## Deferred — 지금은 스킵/대기

- [ ] 실제 Frontend production domain 결정.
- [ ] 실제 Backend API production domain 결정.
- [ ] DNS record 구성.
- [ ] GitHub OAuth App callback production 설정.
- [ ] Production hosting/provider/PostgreSQL 선택.
- [ ] Backend production/staging env와 secrets 등록.
- [ ] Frontend deployment env 등록.
- [ ] 개인정보 처리방침, 이용약관, moderation/report 정책 결정.

## P2 — 제품 polish backlog

- [x] Settings/Projects/Profile tab/control semantics 1차 보강. Settings는 Stage 4, Worklog는 Stage 5, Project/Profile tabpanel 연결은 Stage 6에서 완료.
- [x] Project/Profile tabs의 `aria-controls`/tabpanel 연결 보강.
- [x] Explore/Leaderboard loading, empty, retry, load-more failure states 1차 보강. Stage 7에서 skeleton/empty panel/responsive podium 처리 완료.
- [x] Dashboard/Notifications/Moderation authenticated loading, empty, retry, load-more failure states 1차 보강. Stage 8에서 skeleton/empty panel/data-loading guard 처리 완료.
- [x] Static InfoPage, Header profile affordance, custom 404 1차 보강. Stage 9에서 branded utility shell/recovery links/accessibility contract 처리 완료.
- [x] Browser visual QA로 Landing/Feed/Docs/404/Dashboard/Notifications desktop/mobile landmark, heading, overflow 확인. Stage 10에서 `main`/`h1` 누락과 anonymous auth skeleton 보강 완료.
- [x] Settings token lifecycle UI polish. Stage 11에서 Settings skeleton/main landmark, one-time secret panel, token card, rotate/revoke feedback banner를 보강하고 desktop/mobile `/settings` browser smoke 완료.
- [x] Worklog Review publish gate polish. Stage 12에서 publish readiness checklist, action-specific busy state, make-private inline confirmation, review auth-loading `main`/`h1` 보강과 `/worklogs/:id/review` browser smoke 완료.
- [x] Profile follow/action feedback polish. Stage 13에서 follow panel, success/error live feedback, section-level alert, loading/error `main` landmark를 보강하고 `/profile/:username` route smoke 완료.
- [x] Project detail action/edit/delete feedback polish. Stage 14에서 hero action group, mutation feedback, danger zone, delete confirmation accessibility, loading/error `main` landmark를 보강하고 `/projects/:owner/:slug` route smoke 완료.
- [x] Search input/results/empty/loading polish. Stage 15에서 search form label/helper, active filter affordance, skeleton loading, composed empty states, result summary, load-more alert를 보강하고 `/search` route smoke 완료.
- [x] CLI browser approval polish. Stage 16에서 `/cli/authorize` loading/login/ready/approved/error state panel, trust notes, live success/alert feedback을 보강하고 route smoke 완료.
- [x] Cross-page production visual/DOM QA. Stage 17에서 desktop/mobile 28 route checks로 overflow/crash/main landmarks를 확인하고 Explore/Leaderboard/Projects main landmark 누락과 `next start` production regression을 수정.
- [x] Authenticated success-state visual smoke. Stage 18에서 개인 서버 production stack으로 CLI approval, Settings token lifecycle, Profile follow, Project create/edit/delete, Worklog review publish/detail, mobile spot checks를 screenshot+DOM 기준으로 검증.
- [x] Worklog detail multi-model evidence polish. Stage 18에서 Session metrics의 Models/Modes/Sources/Window 값을 truncate 대신 wrap 처리하고 hover title을 추가.
- [ ] 사용자용 quick-start 문서와 개발자용 runbook 분리.
- [ ] commercial readiness evidence artifact 위치와 재실행 절차를 운영 runbook으로 분리.
- [ ] 실제 배포 후 [[Runtime Configuration]]에 production URL/환경 예시 추가.

## Public release 메모

- [x] CLI `package.json.homepage`가 실제 domain 또는 GitHub/docs URL을 가리키도록 정리: [[CLI Release Metadata Homepage Guard 2026-06-08]].
- [ ] `license: UNLICENSED` 유지 여부 결정. public npm 배포 전 owner가 정책을 확정해야 한다.
- [ ] npm package 이름/README/install command 최종 확인.
- [x] npm tarball 설치 후 첫 사용자 CLI UX smoke를 release preflight에 포함.
- [x] GitHub Actions usage limit 동안 CI는 PR/manual trigger로 제한하고, direct `main` push는 로컬 `npm run release:preflight` evidence로 대체.
- [x] Frontend landing copy의 `agentfeed preview --remote` 문구 점검. 현재 CLI에 `preview --remote`가 존재하므로 유지 가능.
- [x] [[Backend Integration Guide CLI Contract 2026-06-08]] — Backend setup guide API의 예시 command를 현재 CLI shipped command와 일치하도록 정리.
- [x] [[Frontend Brand Assets V2 2026-06-07]] — mainline logo/icon/OG asset polish completed and verified.
- [x] [[Frontend Agent Glyph Assets 2026-06-07]] — Claude/Codex/Cursor/Gemini text badges replaced with owned SVG glyphs.
- [x] [[Frontend GitHub Avatar Coverage 2026-06-08]] — GitHub profile avatars preserved across feed/worklog/project owner/profile/settings surfaces, and OpenAPI contracts now guard visible user actor `avatar_url` fields.
- [x] [[Search Project Pagination Dedupe 2026-06-08]] — Search load-more now dedupes project rows by owner plus slug so duplicate project slugs from different users remain visible.
- [x] [[Project Key Helper Consolidation 2026-06-08]] — Projects/Search/Profile/Explore now reuse a shared owner-aware project key helper to prevent duplicate-slug drift.
- [x] [[User Avatar Residual Coverage 2026-06-08]] — CLI authorize account card now renders the signed-in GitHub avatar, and worklog comments use a shared author/avatar-safe adapter before rendering.
- [x] [[CLI Auth Ingest Avatar Contract 2026-06-08]] — CLI auth exchange, ingestion status, managed token rotate, saved credentials, OpenAPI gate, and OAuth smoke now preserve GitHub `avatar_url`.
- [x] [[User Avatar Owner Review Coverage 2026-06-08]] — Dashboard recent worklogs, Worklog Review public preview, and project owner adapters now preserve GitHub avatars even when public username is missing.
- [x] [[Frontend Profile Link Identity Guard 2026-06-08]] — Header, Feed, Search, Explore, Leaderboard, and Worklog Detail now avoid backend-id profile links for username-missing users.

## Completed
- [[Human Checklist Release Metadata Refresh 2026-06-08]] — owner action checklist의 stale CLI homepage 결정 문구를 현재 GitHub README canonical homepage 상태로 정리 완료.
- [[Dev Smoke Homepage Fixture Guard 2026-06-08]] — cross-repo smoke fixture와 product brief도 GitHub README homepage 기준으로 동기화하고 `agentfeed.dev` homepage fixture 재도입 guard 추가 완료.
- [[CLI Release Metadata Homepage Guard 2026-06-08]] — 준비되지 않은 `agentfeed.dev` 대신 GitHub README를 CLI npm homepage로 사용하고 release preflight guard를 동기화 완료.
- [[Frontend Setup Guide Payload Guard 2026-06-08]] — malformed integration setup-guide payload가 Settings render crash로 이어지지 않도록 Frontend API boundary runtime guard 추가 완료.
- [[Frontend Integration Compatibility Probe 2026-06-08]] — Settings가 소비하는 `/me/integrations`와 `/integrations/{type}/setup-guide`를 Frontend mock/hosted compatibility 및 Dev OpenAPI gate에 포함 완료.
- [[Frontend Integration Setup Guide Surface 2026-06-08]] — Settings integrations card가 Backend setup-guide API를 실제로 소비하고 CLI command snippets를 표시하도록 연결 완료.
- [[Backend Integration Guide CLI Contract 2026-06-08]] — setup guide API에서 stale `configure`/`connect` CLI command 제거 및 contract test 추가 완료.
- [[Backend Public Username Discovery Guard 2026-06-08]] — search/explore/leaderboard profile entry API에서 username 없는 user 노출 방지 완료.
- [[GitHub Avatar Fallback Refresh 2026-06-08]] — 기존 GitHub 계정 avatar refresh 및 frontend github_url-only avatar fallback 완료.
