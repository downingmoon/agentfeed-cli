---
title: Active Tasks
aliases:
  - AgentFeed 다음 작업
  - CLI TODO Board
status: active
tags:
  - agentfeed/todo
  - project/tasks
updated: 2026-06-22
---

# Active Tasks

## 현재 결론


> [!success] 2026-06-22 CLI ingest payload contract test split
> CLI oversized `tests/api-hook.test.ts`에서 `draftToIngestRequest()` source identity privacy, repository URL sanitation, collected model serialization, metadata redaction, and share note mapping contracts를 focused ingest-payload suite로 분리했다. Targeted split 2 files / 46 tests, typecheck/build, full CLI suite 141 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Ingest Payload Contract Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI remote preview contract test split
> CLI oversized `tests/api-hook.test.ts`에서 `previewDraftRemote()` remote preview upload payload, backend warnings, and malformed preview envelope fail-closed contracts를 focused remote-preview suite로 분리했다. Targeted split 2 files / 53 tests, typecheck/build, full CLI suite 140 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Remote Preview Contract Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI upload response safety test split
> CLI oversized `tests/api-hook.test.ts`에서 malformed upload success envelope, unsafe review URL, unknown status, and duplicate-ingest untrusted review URL safety contracts를 focused upload-response suite로 분리했다. Targeted split 2 files / 64 tests, typecheck/build, full CLI suite 139 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Upload Response Safety Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI browser login polling test split
> CLI oversized `tests/api-hook.test.ts`에서 `waitForCliAuthExchange()` browser approval polling, transient retry, terminal failure, and timeout sleep-cap contracts를 focused polling suite로 분리했다. Targeted split 2 files / 68 tests, typecheck/build, full CLI suite 138 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Browser Login Polling Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI browser login flow test split
> CLI oversized `tests/api-hook.test.ts`에서 browser login orchestration, credential-save guard, CI fail-fast, and repo-local API discovery policy contracts를 focused browser-login suites로 분리했다. Targeted split 3 files / 92 tests, typecheck/build, full CLI suite 137 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Browser Login Flow Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI auth session API test split
> CLI oversized `tests/api-hook.test.ts`에서 direct CLI auth session creation/exchange and authorize URL trust contract checks를 `cli-auth-session-api` suite로 분리했다. Baseline 1 file / 101 tests, targeted split 2 files / 101 tests, typecheck/build, full CLI suite 135 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Auth Session API Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI API health check test split
> CLI oversized `tests/api-hook.test.ts`에서 API metadata compatibility, backend readiness reachability, ingestion token status/error contract checks를 `cli-api-health-checks` suite로 분리했다. Baseline 1 file / 127 tests, targeted split 2 files / 127 tests, typecheck/build, full CLI suite 134 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI API Health Check Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI Claude hook installer test split
> CLI oversized `tests/api-hook.test.ts`에서 Claude Code hook installer 계약을 `cli-claude-code-hook-installer` suite로 분리했다. Baseline 1 file / 133 tests, targeted split 2 files / 133 tests, typecheck/build, full CLI suite 133 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Claude Hook Installer Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI share command residual test split
> CLI generic `tests/cli-share.test.ts`에 남아 있던 human upload completion output과 dry-run command execution policy 계약을 purpose-named suites로 분리하고 catch-all suite를 삭제했다. Baseline 1 file / 2 tests, targeted split 2 files / 2 tests, typecheck/build, full CLI suite 132 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Share Command Residual Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI publish review handoff test split
> CLI `tests/cli-share.test.ts`에서 publish review URL browser/clipboard handoff policy 계약을 `cli-publish-review-handoff` suite로 분리했다. Baseline 1 file / 6 tests, targeted split 2 files / 6 tests, typecheck/build, full CLI suite 131 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Publish Review Handoff Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI upload confirmation test split
> CLI `tests/cli-share.test.ts`에서 share/publish human-readable upload confirmation gate 계약을 `cli-upload-confirmation` suite로 분리했다. Baseline 1 file / 10 tests, targeted split 2 files / 10 tests, typecheck/build, full CLI suite 130 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Upload Confirmation Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI publish locking test split
> CLI `tests/cli-share.test.ts`에서 direct publish concurrent locking 계약을 `cli-publish-json-locking` suite와 shared process helper로 분리했다. Baseline 1 file / 11 tests, targeted split 2 files / 11 tests, typecheck/build, full CLI suite 129 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Publish Locking Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI publish JSON test split
> CLI `tests/cli-share.test.ts`에서 direct publish JSON output, default no-side-effect behavior, requested review URL handoff failure JSON reporting 계약을 `cli-publish-json-*` suites와 shared helper로 분리했다. Targeted split 3 files / 14 tests, typecheck/build, full CLI suite 128 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Publish JSON Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI share JSON upload test split
> CLI `tests/cli-share.test.ts`에서 share JSON upload output, review URL handoff, upload-failure side-effect 계약을 `cli-share-json-*` suites와 shared helper로 분리했다. Targeted split 4 files / 21 tests, typecheck/build, full CLI suite 126 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Share JSON Upload Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI upload preflight failure test split
> CLI `tests/cli-share.test.ts`에서 upload preflight failure 계약을 share/publish 전용 suite와 shared helper로 분리했다. Targeted split 3 files / 25 tests, typecheck/build, full CLI suite 123 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Upload Preflight Failure Test Split 2026-06-22]]




> [!success] 2026-06-22 CLI publish cache test split
> CLI `tests/cli-share.test.ts`에서 direct `agentfeed publish` cached-upload reuse/preflight/token-status/privacy-policy 계약을 `cli-publish-cache` suite와 shared fixture helper로 분리했다. Targeted split 2 files / 30 tests, typecheck/build, full CLI suite 121 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Publish Cache Test Split 2026-06-22]]




> [!success] 2026-06-22 CLI open review URL test split
> CLI `tests/cli-share.test.ts`에서 `agentfeed open` review URL trust/rejection/fallback 계약을 `cli-open-review-trust`, `cli-open-review-rejection`, shared fixture helper로 분리했다. Targeted split 3 files / 44 tests, typecheck/build, full CLI suite 120 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Open Review URL Test Split 2026-06-22]]



> [!success] 2026-06-22 CLI share guidance test split
> CLI `tests/cli-share.test.ts`에서 share/publish guidance 및 dry-run human/JSON output 계약을 `cli-share-guidance`, `cli-share-dry-run-output`, shared fixture helper로 분리했다. Baseline 54 passed, final targeted 54 passed, typecheck/build, full CLI suite 118 files / 848 tests, git diff --check, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Share Guidance Test Split 2026-06-22]]


> [!success] 2026-06-22 Frontend run-ci contract split
> Frontend `scripts/run-ci.contract.test.mjs`의 457 pure LOC direct Node contract를 core CI ordering, hosted guard, failure propagation suite와 shared helper로 분리했다. Targeted split, registry self-test, full `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 런타임 변경 및 배포 없음.
> - [[Frontend Run CI Contract Split 2026-06-22]]


> [!success] 2026-06-22 Backend rate limit store contract split
> Backend `tests/test_rate_limit_store.py`의 378 pure LOC 과밀 contract coverage를 in-memory store, degraded fallback, database store, production settings 책임별 suite로 분리했다. Baseline 14 passed, split focused 14 passed, rate-limit suite 42 passed, ruff, git diff --check, changed-file LOC audit를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Backend Rate Limit Store Contract Split 2026-06-22]]


> [!success] 2026-06-22 Frontend targeted contract runner
> Frontend `scripts/run-contract-tests.mjs`가 optional target arguments와 local `node_modules/.bin/tsc` fallback을 지원하도록 보강했고, registry completeness self-test로 contract source list 누락/stale drift를 차단했다. 직접 `node scripts/run-contract-tests.mjs <contract-file>` 검증, unknown-target failure, targeted self-test, full contract suite, lint를 통과했다. 신규 앱 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Targeted Contract Runner 2026-06-22]]



> [!success] 2026-06-22 Frontend stale contract TODO reconciliation
> Frontend contract/test 문서 중 이미 처리된 `worklog-review-strict-fields.contract.test.ts` re-scan 후보, `adaptWorklogCard()` return cast, project visibility select cast TODO를 현재 source-contract evidence 기준으로 정리했다. `npm run test:contracts`, `npm run lint` 통과. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Stale Contract TODO Reconciliation 2026-06-22]]




> [!success] 2026-06-21 CLI init/logout command split
> `agentfeed init` and `agentfeed logout` CLI surface orchestration을 `src/cli/index.ts`에서 `src/cli/init-command.ts`, `src/cli/logout-command.ts`로 분리했다. `src/cli/index.ts`를 230 pure LOC로 낮췄고 새 wrapper tests, focused CLI/output/help tests, typecheck/build, full suite, dist CLI smoke를 통과했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Init Logout Command Split 2026-06-21]]



> [!success] 2026-06-21 CLI collect command split
> `agentfeed collect` CLI surface orchestration을 `src/cli/index.ts`에서 `src/cli/collect-command.ts`로 분리했다. 새 wrapper tests, focused collect tests, typecheck/build, full suite, dist CLI collect smoke를 통과했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Collect Command Split 2026-06-21]]



> [!success] 2026-06-21 CLI share command split
> `agentfeed share` CLI surface orchestration을 `src/cli/index.ts`에서 `src/cli/share-command.ts`로 분리했다. 새 wrapper tests, focused share tests, typecheck/build, full suite, dist CLI share dry-run/token-missing smoke를 통과했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Share Command Split 2026-06-21]]



> [!success] 2026-06-21 CLI local draft command split
> `agentfeed drafts`, `agentfeed discard`, `agentfeed open` local draft orchestration을 `src/cli/index.ts`에서 `src/cli/local-draft-command.ts`로 분리했다. 새 wrapper tests, focused local draft tests, typecheck/build, full suite, dist CLI drafts/discard/open smoke를 통과했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Local Draft Command Split 2026-06-21]]


> [!success] 2026-06-21 CLI publish command split
> `agentfeed publish` CLI surface orchestration을 `src/cli/index.ts`에서 `src/cli/publish-command.ts`로 분리했다. Publish wrapper tests, publish execution/output focused tests, typecheck/build, full suite, dist CLI publish smoke를 통과했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Publish Command Split 2026-06-21]]


> [!success] 2026-06-21 CLI command surface split
> CLI help/completion/commands command surface orchestration을 `src/cli/index.ts`에서 `src/cli/command-surface-command.ts`로 분리했다. Focused command-surface tests, typecheck/build, full suite, dist CLI help/completion/commands smoke를 통과했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Command Surface Split 2026-06-21]]


> [!success] 2026-06-21 CLI publish credential context diagnostics
> `agentfeed publish`의 upload preflight 401 실패 메시지에 저장 토큰 출처(OS keychain/file/environment), credential store, API base URL/source, credentials file path를 포함하도록 보강했다. `AGENTFEED_TOKEN`이 비어있어도 browser login 저장 방식에서는 정상일 수 있음을 메시지에 명시했다. Focused upload-preflight/publish-execution tests와 typecheck를 통과했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Publish Credential Context Diagnostics 2026-06-21]]



> [!success] 2026-06-21 CLI hook command split
> `agentfeed hook install/uninstall claude-code` orchestration을 `src/cli/index.ts`에서 `src/cli/hook-command.ts`로 분리했다. Baseline/focused hook/recovery tests, full CLI suite, typecheck/build, dist CLI hook smoke를 통과했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Hook Command Split 2026-06-21]]


> [!success] 2026-06-21 CLI doctor command split
> `agentfeed doctor` orchestration을 `src/cli/index.ts`에서 `src/cli/doctor-command.ts`로 분리했다. Baseline/focused doctor/status tests, typecheck/build, dist CLI human/json doctor smoke를 통과했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Doctor Command Split 2026-06-21]]


> [!success] 2026-06-21 CLI status command split
> `agentfeed status` orchestration을 `src/cli/index.ts`에서 `src/cli/status-command.ts`로 분리했다. Baseline/focused status tests, typecheck/build, dist CLI human/json status smoke를 통과했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Status Command Split 2026-06-21]]


> [!success] 2026-06-21 CLI rotate command split
> `agentfeed rotate` orchestration을 `src/cli/index.ts`에서 `src/cli/rotate-command.ts`로 분리했다. Focused rotate tests, full CLI suite, typecheck/build, dist CLI fake API smoke를 통과했고 old-token status check, `replace_token_id`, new-token pre-save validation, secret non-leak을 확인했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Rotate Command Split 2026-06-21]]

> [!success] 2026-06-21 CLI login command split
> `agentfeed login` orchestration을 `src/cli/index.ts`에서 `src/cli/login-command.ts`로 분리했다. Baseline/focused login tests, auth/keychain regression, full CLI suite, typecheck/build, dist CLI token-stdin smoke를 통과했다. 신규 기능 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[CLI Login Command Split 2026-06-21]]



> [!success] 2026-06-19 Frontend worklog card malformed adapter assertion move
> Frontend malformed worklog card adapter source/metrics/viewer_state fail-closed assertion loops를 `worklog-card-malformed-adapter.contract.test.ts`에서 새 `worklog-card-malformed-adapter-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npx tsc --noEmit`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Card Malformed Adapter Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend feed filter keyboard assertion move
> Frontend feed filter keyboard source-contract assertions를 `feed-filter-keyboard.contract.test.ts`에서 새 `feed-filter-keyboard-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npx tsc --noEmit`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, `FeedPage.tsx` 변경 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Feed Filter Keyboard Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Personal server one-off deploy after account strict field assertion move
> 사용자의 이번 턴 한정 명시 요청으로 `account-strict-fields` assertion move 및 문서화 완료 후 현재 서버 `/home/ubuntu/agentfeed`에 최신 작업분을 1회 재배포했다. Frontend/backend/postgres healthcheck, backend readiness, frontend root `200 OK`, 외부 frontend/backend HTTP `200`을 확인했다. 이번 예외 이후 기존 “서버/인프라/CI/CD 보류” 및 “서버 배포 금지” 제약은 다시 유지한다.
> - [[Personal Server Deploy One-off Refresh 2026-06-19#2026-06-19 21:12 UTC — Post account strict field assertion move refresh]]



> [!success] 2026-06-19 Frontend account strict field assertion move
> Frontend set-username valid backend response preservation and extra-field fail-closed assertions를 `account-strict-fields.contract.test.ts`에서 새 `account-strict-field-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npx tsc --noEmit`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 없음. 사용자 요청 1회 예외 배포는 작업 완료 후 별도 실행/검증한다.
> - [[Frontend Account Strict Field Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Frontend collection evidence assertion move
> Frontend collection evidence valid models, per-agent metrics, collection quality, and source trust review assertions를 `collection-evidence.contract.test.ts`에서 새 `collection-evidence-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npx tsc --noEmit`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Collection Evidence Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Personal server one-off deploy after dashboard action assertion move
> 사용자의 이번 작업 완료 후 1회 배포 요청으로 `dashboard-actions` assertion move 및 문서화 완료 후 현재 서버 `/home/ubuntu/agentfeed`에 최신 작업분을 1회 재배포했다. Frontend/backend/postgres healthcheck, backend readiness, frontend root `200 OK`, 외부 frontend/backend HTTP `200`을 확인했다. 이번 예외 이후 기존 “서버/인프라/CI/CD 보류” 및 “서버 배포 금지” 제약은 다시 유지한다.
> - [[Personal Server Deploy One-off Refresh 2026-06-19#2026-06-19 20:00 UTC — Post dashboard action assertion move refresh]]


> [!success] 2026-06-19 Frontend dashboard action assertion move
> Frontend dashboard recent worklog raw/encoded dot-segment action URL fallback assertions를 `dashboard-actions.contract.test.ts`에서 새 `dashboard-action-assertions.ts`로 이동했다. Post-move `npm run test:contracts`, `npx tsc --noEmit`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 없음. 사용자 요청 1회 예외 배포는 작업 완료 후 별도 실행/검증한다.
> - [[Frontend Dashboard Action Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Frontend username check strict field assertion move
> Frontend username check valid reason semantics and extra-field fail-closed assertion을 `username-check-strict-fields.contract.test.ts`에서 새 `username-check-strict-field-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Username Check Strict Field Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Personal server one-off deploy after public user strict stats assertion move
> 사용자의 이번 작업 완료 후 1회 배포 요청으로 `public-user-strict-stats` assertion move 및 문서화 완료 후 현재 서버 `/home/ubuntu/agentfeed`에 최신 작업분을 1회 재배포했다. Frontend/backend/postgres healthcheck, backend readiness, frontend root `200 OK`, 외부 frontend/backend HTTP `200`을 확인했다. 이번 예외 이후 기존 “서버/인프라/CI/CD 보류” 및 “서버 배포 금지” 제약은 다시 유지한다.
> - [[Personal Server Deploy One-off Refresh 2026-06-19#2026-06-19 19:12 UTC — Post public user strict stats assertion move refresh]]


> [!success] 2026-06-19 Frontend public user strict stats assertion move
> Frontend `users.get()` strict public-user stats preservation, malformed strict stats/viewer-state fail-closed iteration, and fetch override/restore flow를 `public-user-strict-stats.contract.test.ts`에서 새 `public-user-strict-stats-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Public User Strict Stats Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Frontend auth session marker assertion move
> Frontend anonymous public route no-probe, browser session marker-present public probe, auth-required/review route probe, and CLI authorize marker assertions를 `auth-session-marker.contract.test.ts`에서 새 `auth-session-marker-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Auth Session Marker Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Personal server one-off deploy after API error list assertion move
> 사용자의 이번 턴 한정 명시 요청으로 `api-error-list` assertion move 및 문서화 완료 후 현재 서버 `/home/ubuntu/agentfeed`에 최신 작업분을 1회 재배포했다. Frontend/backend/postgres healthcheck, backend readiness, frontend root `200 OK`, 외부 frontend/backend HTTP `200`을 확인했다. 이번 예외 이후 기존 “서버/인프라/CI/CD 보류” 및 “서버 배포 금지” 제약은 다시 유지한다.
> - [[Personal Server Deploy One-off Refresh 2026-06-19#2026-06-19 18:24 UTC — Post API error list assertion move refresh]]


> [!success] 2026-06-19 Frontend API error list assertion move
> Frontend safe API error display/diagnostic retention/status category/list fallback assertions를 `api-error-list-contracts.contract.test.ts`에서 새 `api-error-list-contract-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Error List Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Frontend select value parser assertion move
> Frontend project sort, moderation report status, and worklog report reason select parser allowed-value/unsupported-value assertions를 `select-value-parsers.contract.test.ts`에서 새 `select-value-parser-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Select Value Parser Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Frontend worklog detail adapter assertion move
> Frontend `adaptWorklog()` valid detail outcome/timeline preservation, public `user_note` dropping, malformed payload fail-closed loop, and expected diagnostic assertion을 `worklog-detail-adapter.contract.test.ts`에서 새 `worklog-detail-adapter-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Detail Adapter Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Frontend worklog detail response assertion move
> Frontend valid worklog detail payload preservation, fetch override/restore flow, and multi-agent metrics/updated timestamp checks를 `worklog-detail-response-guards.contract.test.ts`에서 새 `worklog-detail-response-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Detail Response Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Personal server one-off deploy after ingestion token response assertion move
> 사용자의 이번 턴 한정 명시 요청으로 `ingestion-token-response` assertion move 및 문서화 완료 후 현재 서버 `/home/ubuntu/agentfeed`에 최신 작업분을 1회 재배포했다. Frontend/backend/postgres healthcheck, backend readiness, frontend root `200 OK`, 외부 frontend/backend HTTP `200`을 확인했다. 이번 예외 이후 기존 “서버/인프라/CI/CD 보류” 및 “서버 배포 금지” 제약은 다시 유지한다.
> - [[Personal Server Deploy One-off Refresh 2026-06-19#2026-06-19 14:49 UTC — Post ingestion token response assertion move refresh]]


> [!success] 2026-06-19 Frontend ingestion token response assertion move
> Frontend malformed ingestion token list/create/rotate response cases iteration, fetch override/restore flow, API call exercise, and 502 diagnostic fail-closed assertion을 `ingestion-token-response-guards.contract.test.ts`에서 새 `ingestion-token-response-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 없음. 사용자 요청 1회 예외 배포는 작업 완료 후 별도 실행/검증한다.
> - [[Frontend Ingestion Token Response Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Frontend CLI auth malformed response assertion move
> Frontend malformed CLI auth response cases iteration, fetch override/restore flow, API call exercise, and 502 diagnostic fail-closed assertion을 `cli-auth-malformed-response.contract.test.ts`에서 새 `cli-auth-malformed-response-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend CLI Auth Malformed Response Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend project mutation response assertion move
> Frontend project mutation unexpected backend response field fail-closed assertion을 `project-mutation-response-contracts.contract.test.ts`에서 새 `project-mutation-response-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Mutation Response Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend header logic assertion move
> Frontend signed-out/signed-in header link contract, active-link matching, and search query href encoding/blank handling assertions를 `header-logic.contract.test.ts`에서 새 `header-logic-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Header Logic Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend explore strict field assertion move
> Frontend explore section valid normalization and top-level/trending-project/popular-prompt/featured-category extra-field fail-closed assertions를 `explore-strict-fields.contract.test.ts`에서 새 `explore-strict-field-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Explore Strict Field Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend project stats strict field assertion move
> Frontend exact backend ProjectStats field preservation, malformed project stats fail-closed checks, and fetch override/restore flow를 `project-stats-strict-fields.contract.test.ts`에서 새 `project-stats-strict-field-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Stats Strict Field Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Personal server one-off deploy after CLI auth strict-field move
> 사용자의 명시 요청으로 `cli-auth-strict-fields` assertion move 작업 완료 후 현재 서버 `/home/ubuntu/agentfeed`에 최신 소스를 1회 재배포했다. Frontend/backend/postgres healthcheck와 backend readiness, frontend root `200 OK` 스모크를 확인했다. 이번 예외 이후 기존 “서버/인프라/CI/CD 보류” 및 “서버 배포 금지” 제약은 다시 유지한다.
> - [[Personal Server Deploy One-off Refresh 2026-06-19#2026-06-19 07:48 UTC — Post CLI auth strict-field assertion move refresh]]



> [!success] 2026-06-19 Frontend CLI auth strict field assertion move
> Frontend CLI auth session/approve strict-field preservation and extra-field fail-closed assertions를 `cli-auth-strict-fields.contract.test.ts`에서 새 `cli-auth-strict-field-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 없음. 사용자 요청 1회 예외 배포는 작업 완료 후 별도 실행/검증한다.
> - [[Frontend CLI Auth Strict Field Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend worklog review publish assertion move
> Frontend worklog review publish stale-refresh ordering, fail-closed privacy scan, and unsafe parser guard assertions를 `worklog-review-publish.contract.test.ts`에서 새 `worklog-review-publish-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Review Publish Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend comment response guard assertion move
> Frontend valid comment list field preservation, public author metadata mapping, pagination preservation, and malformed comment fail-closed assertions를 `comment-response-guards.contract.test.ts`에서 새 `comment-response-guard-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move/current re-check `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 없음. 배포는 이 contract refactor 단위에 포함하지 않았고 사용자 요청 1회 예외는 별도 노트에 기록했다.
> - [[Frontend Comment Response Guard Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend project mutation form assertion move
> Frontend project mutation form create/update serializer and nullable clear semantics assertions를 `project-mutation-form-contracts.contract.test.ts`에서 새 `project-mutation-form-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Mutation Form Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend list merge contract assertion move
> Frontend list merge and project result key assertions를 `list-merge-contracts.contract.test.ts`에서 새 `list-merge-contract-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend List Merge Contract Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend worklog card adapter assertion move
> Frontend worklog card adapter collection source/source-null, metrics, hidden stats, viewer-state defaults, raw agent key, nullable arrays assertions를 `worklog-card-adapter.contract.test.ts`에서 새 `worklog-card-adapter-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Card Adapter Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend worklog review validation assertion move
> Frontend privacy finding normalization/rejection assertions와 review public fields validation assertions를 `worklog-review-validation.contract.test.ts`에서 새 `worklog-review-validation-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Review Validation Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend privacy scan strict field assertion move
> Frontend valid privacy scan preservation, malformed privacy scan strict-field fail-closed assertions, fetch override/restore flow를 `privacy-scan-strict-fields.contract.test.ts`에서 새 `privacy-scan-strict-field-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Privacy Scan Strict Field Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Frontend worklog author avatar assertion move
> Frontend hydrated author avatar/name/username preservation assertion과 malformed author fail-closed assertion flow를 `worklog-author-avatar.contract.test.ts`에서 새 `worklog-author-avatar-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Author Avatar Assertion Move 2026-06-19]]



> [!success] 2026-06-19 Personal server one-off deploy refresh
> 사용자의 이번 턴 한정 명시 요청으로 현재 서버 `/home/ubuntu/agentfeed`에 최신 작업분을 동기화하고 `agentfeed-server` backend/frontend 컨테이너를 force-recreate했다. `postgres` 볼륨은 유지했다. Frontend/backend/postgres 모두 healthy, 외부 `http://161.33.171.81:13030/` 및 `http://161.33.171.81:18080/health/ready` 모두 `200` 확인. 이번 1회 예외 이후 기존 “서버/인프라/CI/CD 보류” 및 “서버 배포 금지” 제약은 유지한다.
> - [[Personal Server Deploy One-off Refresh 2026-06-19]]



> [!success] 2026-06-19 Frontend leaderboard user key assertion move
> Frontend malformed leaderboard row fixture and missing-identity fail-closed assertion을 `leaderboard-user-key.contract.test.ts`에서 새 `leaderboard-user-key-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Leaderboard User Key Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Frontend moderation report contract assertion move
> Frontend moderation list/status-update API exercise calls, response unwrap assertions, request count assertions, and request method/path/query/body assertions를 `moderation-report-contracts.contract.test.ts`에서 새 `moderation-report-contract-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Moderation Report Contract Assertion Move 2026-06-19]]


> [!success] 2026-06-19 Frontend account/project mutation response assertion move
> Frontend response helper setup, account/project mutation API action dispatch, fetch override/restore handling, and fail-closed assertion flow를 `account-project-mutation-response-guards.contract.test.ts`에서 새 `account-project-mutation-response-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Account Project Mutation Response Assertion Move 2026-06-19]]


> [!success] 2026-06-18 Frontend worklog action malformed response assertion move
> Frontend malformed publish/unpublish/resolveFinding cases, response helper setup, fetch override/restore handling, and fail-closed assertion flow를 `worklog-action-malformed-response-guards.contract.test.ts`에서 새 `worklog-action-malformed-response-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Action Malformed Response Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend API fetch request hardening assertion move
> Frontend JSON response setup, API action dispatch, fetch override/restore handling, request header capture, and Content-Type/CSRF intent assertions를 `api-fetch-request-hardening.contract.test.ts`에서 새 `api-fetch-request-hardening-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Fetch Request Hardening Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend social action response assertion move
> Frontend malformed like/bookmark/follow cases, response helper setup, fetch override/restore handling, and fail-closed assertion flow를 `social-action-response-guards.contract.test.ts`에서 새 `social-action-response-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Social Action Response Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog card response assertion move
> Frontend response helper setup, fetch override/restore handling, valid worklog card row/public author metadata/pagination assertions, and missing-pagination fail-closed assertion flow를 `worklog-card-response-guards.contract.test.ts`에서 새 `worklog-card-response-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Card Response Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend leaderboard response assertion move
> Frontend response helper setup, fetch override/restore handling, valid leaderboard preservation assertions, and malformed leaderboard fail-closed assertion flow를 `leaderboard-response-contracts.contract.test.ts`에서 새 `leaderboard-response-assertions.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Leaderboard Response Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend project malformed response assertion move
> Frontend response helper setup, project API action dispatch, fetch wiring, and malformed project fail-closed assertion flow를 `project-malformed-response-contracts.contract.test.ts`에서 새 `project-malformed-response-assertions.ts`로 이동했다. 기존 `project-response-fixtures.ts`는 150 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Malformed Response Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog review strict field assertion move
> Frontend response helper, fetch override/restore handling, valid review preservation assertions, and malformed strict-field rejection flow를 `worklog-review-strict-fields.contract.test.ts`에서 새 `worklog-review-strict-field-assertions.ts`로 이동했다. 기존 `worklog-review-response-fixtures.ts`는 112 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Review Strict Field Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend auth next assertion move
> Frontend OAuth next path assertions, unsafe hash/next rejection assertions, and GitHub OAuth URL next-param assertions를 `auth-next-contracts.contract.test.ts`에서 새 `auth-next-contract-assertions.ts`로 이동했다. 기존 `auth-next-contract-fixtures.ts`는 160 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Auth Next Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend project schema variant strict assertion move
> Frontend API/list response helpers, fetch override/restore handling, and valid schema variant preservation assertions를 `project-schema-variants-strict-fields.contract.test.ts`에서 새 `project-schema-variant-strict-field-assertions.ts`로 이동했다. 기존 `project-schema-variant-fixtures.ts`는 172 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Schema Variant Strict Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog metric evidence fixture split
> Frontend malformed metric/source fixtures, metric evidence mismatch factory, malformed metric rejection loop, and malformed source rejection loop를 `worklog-metric-evidence.contract.test.ts`에서 `worklog-metric-evidence-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Metric Evidence Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend API pagination request fixture split
> Frontend pagination response helper, fetch request recorder, URL lookup helper, endpoint exercise calls, encoded path checks, and cursor/limit assertions를 `api-pagination-request-contracts.contract.test.ts`에서 `api-pagination-request-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Pagination Request Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend read-side strict field fixture split
> Frontend activity/integration valid payload fixtures, strict-field rejection helper, valid payload assertions, and extra-field rejection assertions를 `read-side-strict-fields.contract.test.ts`에서 `read-side-strict-fields-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Read Side Strict Field Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend API surface fixture split
> Frontend direct worklog body checks, route-client availability checks, search type coverage, and settings token shape assertions를 `api-surface-contracts.contract.test.ts`에서 `api-surface-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Surface Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend project schema variant malformed assertion move
> Frontend API/list response helpers, project/user/worklog action selection, fail-closed capture, fetch restore handling, and malformed variant assertion runner를 `project-schema-variants-malformed-strict-fields.contract.test.ts`에서 `project-schema-variant-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Schema Variant Malformed Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend auth.me fixture split
> Frontend valid auth.me payload, malformed auth.me cases, normalization assertion, and fail-closed assertion flow를 `auth-me-contracts.contract.test.ts`에서 `auth-me-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Auth Me Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend metadata strict field assertion move
> Frontend metadata compatibility rejection/allowance assertions, insecure server-test review-origin policy assertions, `system.metadata` route assertions, and fetch restore handling을 `metadata-strict-fields.contract.test.ts`에서 `metadata-strict-fields-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Metadata Strict Field Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend project response assertion move
> Frontend valid project list, user project list, direct project detail, owner/slug detail response dispatcher, fetch restore handling, and preservation assertions를 `project-response-contracts.contract.test.ts`에서 `project-response-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Response Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog review action assertion helper split
> Frontend action-control assertion loops, review preview safety assertions, and malformed privacy finding fail-closed assertion을 `worklog-review-action-contracts.contract.test.ts`에서 `worklog-review-action-contract-assertions.ts`로 분리했다. Existing `worklog-review-action-contract-fixtures.ts`가 150 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Review Action Assertion Helper Split 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog detail malformed response fixture split
> Frontend malformed detail cases, JSON response helper, fail-closed contract mismatch assertion, and fetch restore runner를 `worklog-detail-malformed-response-guards.contract.test.ts`에서 `worklog-detail-malformed-response-fixtures.ts`로 분리했다. Shared `worklog-detail-response-fixtures.ts`가 142 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Detail Malformed Response Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend public user leaderboard assertion move
> Frontend public user extra-field fail-closed assertion, leaderboard row preservation/fail-closed assertions, public stats assertions, and malformed public stats assertion을 `public-user-leaderboard-contracts.contract.test.ts`에서 `public-user-leaderboard-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Public User Leaderboard Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend API request contract assertion move
> Frontend request recording, expected request lookup, API client exercise calls, and exact method/path/query assertions를 `api-request-contracts.contract.test.ts`에서 `api-request-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Request Contract Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog review URL scope fixture split
> Frontend review URL source-contract helpers, `review_url` scope assertions, and `worklogReviewHref` trust/fallback assertions를 `worklog-review-url-scope.contract.test.ts`에서 `worklog-review-url-scope-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Review URL Scope Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend user account response guard assertion move
> Frontend valid username/public-user preservation assertions, malformed response fail-closed assertions, and fetch restore handling을 `user-account-response-guards.contract.test.ts`에서 `user-account-response-guard-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend User Account Response Guard Assertion Move 2026-06-18]]


> [!success] 2026-06-18 Frontend dashboard strict field fixture split
> Frontend dashboard summary/recent valid payload fixtures, strict-field rejection helper, root/period/recent extra-field rejection cases, and strict-field assertion runner를 `dashboard-strict-fields.contract.test.ts`에서 `dashboard-strict-fields-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Dashboard Strict Field Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog review action response fixture split
> Frontend valid review response preservation checks, malformed review response cases, JSON response helper, fail-closed ApiError assertion, and fetch restore runner를 `worklog-review-action-response-guards.contract.test.ts`에서 `worklog-review-action-response-fixtures.ts`로 분리했다. Shared `worklog-review-response-fixtures.ts`가 112 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Review Action Response Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog card malformed response fixture split
> Frontend malformed worklog card response cases, JSON response helper, feed-list fail-closed assertion, and fetch restore runner를 `worklog-card-malformed-response-guards.contract.test.ts`에서 `worklog-card-malformed-response-fixtures.ts`로 분리했다. Shared `worklog-card-response-fixtures.ts`가 112 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Card Malformed Response Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend API fetch timeout contract helper move
> Frontend timeout-to-504 assertion, shared timeout constant assertion, caller AbortSignal propagation assertion, following-feed cancellation/safe-param assertion, and fetch/timer restore runner를 `api-fetch-timeout-cancellation.contract.test.ts`에서 existing `api-fetch-timeout-cancellation-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Fetch Timeout Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog mutation body contract helper move
> Frontend worklog mutation JSON response helper, fetch request recorder, comment/finding-resolution/publish/unpublish response assertions, exact route/body assertions, and fetch restore runner를 `worklog-mutation-body-contracts.contract.test.ts`에서 existing `worklog-mutation-body-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Mutation Body Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend settings profile validation fixture split
> Frontend invalid profile form helper, text-bound validation cases, backend-aligned URL validation cases, no-profile-mutation assertions, and validation runners를 `settings-profile-validation.contract.test.ts`에서 `settings-profile-validation-fixtures.ts`로 분리했다. Shared `settings-profile-save.contract-fixtures.ts`가 156 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Settings Profile Validation Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend remaining read response contract helper move
> Frontend valid remaining-read JSON response helper, path-based valid response dispatcher, moderation/dashboard/recent-worklog/notification/activity/suggestion/tag preservation assertions, and fetch restore runner를 `remaining-read-response-guards.contract.test.ts`에서 existing `remaining-read-response-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Remaining Read Response Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend explore response guard fixture split
> Frontend valid explore section preservation, malformed nested worklog/project/prompt/builder/category cases, JSON response helper, fail-closed ApiError assertion, and fetch restore runner를 `explore-response-guards.contract.test.ts`에서 `explore-response-guard-fixtures.ts`로 분리했다. Shared `search-explore-response-fixtures.ts`가 136 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Explore Response Guard Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend security header contract helper move
> Frontend static security header checks, IP-only server-test header checks, required CSP directive checks, arbitrary inline CSP rejection checks, and API-origin CSP handling checks를 `security-headers.contract.test.ts`에서 existing `security-headers-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Security Header Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend ingestion token mutation contract helper move
> Frontend ingestion-token mutation JSON response helper, fetch request recorder, create/rotate/revoke response assertions, exact route/body assertions, and fetch restore runner를 `ingestion-token-mutation-contracts.contract.test.ts`에서 existing `ingestion-token-mutation-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Ingestion Token Mutation Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog list adapter fixture split
> Frontend valid worklog row preservation, malformed worklog row fail-closed cases, public worklog filtering, valid user preservation, and malformed user fail-closed cases를 `worklog-list-adapters.contract.test.ts`에서 `worklog-list-adapter-fixtures.ts`로 분리했다. Shared `worklog-card-contract-fixtures.ts`가 187 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog List Adapter Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend me client mutation contract helper move
> Frontend me client mutation request assertions, fetch capture runner, and create-token/profile-update/username-update response assertions를 `me-client-mutation-contracts.contract.test.ts`에서 existing `me-client-mutation-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Me Client Mutation Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend integration status contract fixture split
> Frontend valid integration status payloads, malformed type/status cases, response helper, preservation assertion, and fail-closed runner를 `integration-status-contracts.contract.test.ts`에서 `integration-status-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Integration Status Contract Fixture Split 2026-06-18]]



> [!success] 2026-06-18 Frontend settings profile validation save fixture split
> Frontend missing-username validation and invalid-username-format no-partial-save assertions를 `settings-profile-validation-save.contract.test.ts`에서 `settings-profile-validation-save-fixtures.ts`로 분리했다. Existing `settings-profile-save.contract-fixtures.ts`가 156 pure LOC라 grow하지 않았다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Settings Profile Validation Save Fixture Split 2026-06-18]]



> [!success] 2026-06-18 Frontend project mutation contract helper move
> Frontend project mutation API surface, request recorder, exact method/path/body/Content-Type, and create/update/delete response assertions를 `project-mutation-contracts.contract.test.ts`에서 existing `project-mutation-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Mutation Contract Helper Move 2026-06-18]]



> [!success] 2026-06-18 Frontend API response envelope hardening helper move
> Frontend allowlisted empty OkResponse, unexpected OkResponse field, malformed envelope, non-allowlisted empty success checks, and envelope action dispatcher를 `api-response-envelope-hardening.contract.test.ts`에서 existing `api-response-envelope-hardening-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Response Envelope Hardening Helper Move 2026-06-18]]



> [!success] 2026-06-18 Frontend feed filter contract fixture split
> Frontend backend sort/time coverage, sort/time label-param mapping, scope/query serialization, and tag normalization assertions를 `feed-filter-contracts.contract.test.ts`에서 `feed-filter-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Feed Filter Contract Fixture Split 2026-06-18]]



> [!success] 2026-06-18 Frontend search response guard fixture split
> Frontend valid search response, malformed search response cases, nested payload assertions, and fail-closed malformed response runner를 `search-response-guards.contract.test.ts`에서 `search-response-guard-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Search Response Guard Fixture Split 2026-06-18]]



> [!success] 2026-06-18 Frontend remaining read malformed response fixture split
> Frontend moderation, dashboard, notification, activity, suggestion, and tag malformed read response cases plus fail-closed fetch runner를 `remaining-read-malformed-response-guards.contract.test.ts`에서 `remaining-read-malformed-response-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Remaining Read Malformed Response Fixture Split 2026-06-18]]



> [!success] 2026-06-18 Frontend CLI authorize session contract fixture split
> Frontend CLI authorize session source-safety, fake window/sessionStorage, stored/malformed session, incoming query cleanup, and clear-session assertions를 `cli-authorize-session.contract.test.ts`에서 `cli-authorize-session-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend CLI Authorize Session Contract Fixture Split 2026-06-18]]



> [!success] 2026-06-18 Frontend auth theme social contract fixture split
> Frontend follow/auth/comment intent, optimistic social action, and theme bootstrap assertions를 `auth-theme-social-contracts.contract.test.ts`에서 `auth-theme-social-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Auth Theme Social Contract Fixture Split 2026-06-18]]



> [!success] 2026-06-18 Frontend identity profile contract helper move
> Frontend avatar user, id-only avatar display, GitHub avatar fallback, comment avatar, and profile link assertions를 `identity-profile-contracts.contract.test.ts`에서 existing `identity-profile-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Identity Profile Contract Helper Move 2026-06-18]]



> [!success] 2026-06-18 Frontend project mutation detail adapter fixture split
> Frontend project mutation URL/timestamp/tag/stat preservation, malformed mutation, detail stat preservation, and malformed detail assertions를 `project-mutation-detail-adapters.contract.test.ts`에서 `project-mutation-detail-adapter-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Mutation Detail Adapter Fixture Split 2026-06-18]]



> [!success] 2026-06-18 Frontend URL navigation contract fixture split
> Frontend review origin, worklog detail/review/permalink, project href, and dashboard recent worklog URL assertions를 `url-navigation-contracts.contract.test.ts`에서 `url-navigation-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend URL Navigation Contract Fixture Split 2026-06-18]]



> [!success] 2026-06-18 Frontend API response hardening contract helper move
> Frontend unexpected auth user fields, malformed auth error envelope suppression, and auth-error event scenario assertions를 `api-response-hardening.contract.test.ts`에서 existing `api-response-hardening-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Response Hardening Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend API response body hardening fixture split
> Frontend oversized response body, body stream read failure, and malformed successful response fail-closed scenarios를 `api-response-body-hardening.contract.test.ts`에서 `api-response-body-hardening-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Response Body Hardening Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend API error diagnostic contract helper move
> Frontend non-JSON auth/mutation error redaction assertions and JSON backend envelope diagnostics assertions를 `api-error-diagnostics.contract.test.ts`에서 existing `api-error-diagnostics-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Error Diagnostic Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend user activity contract fixture split
> Frontend user activity surface check, request recorder, response fixture, encoded username/path/query assertions, and fetch restore runner를 `user-activity-contracts.contract.test.ts`에서 `user-activity-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend User Activity Contract Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog card share action fixture split
> Frontend worklog card native-share, clipboard fallback, blocked clipboard, native+clipboard failure, and user-facing share result message assertions를 `worklog-card-share-actions.contract.test.ts`에서 `worklog-card-share-action-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Card Share Action Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog detail strict field contract helper move
> Frontend worklog detail/card strict-field raw private/social/viewer/diagnostics cases, contract failure capture, and diagnostics preservation checks를 `worklog-detail-strict-fields.contract.test.ts`에서 existing `worklog-detail-strict-fields-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Detail Strict Field Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend social report contract fixture split
> Frontend social report request recorder, JSON response helper, worklog/comment report assertions, and fetch restore runner를 `social-report-contracts.contract.test.ts`에서 `social-report-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Social Report Contract Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend me settings mutation contract fixture split
> Frontend me settings privacy/notification response fixtures, PATCH request capture, unwrap assertions, and request-body assertions를 `me-settings-mutation-contracts.contract.test.ts`에서 `me-settings-mutation-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Me Settings Mutation Contract Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend integration guide contract fixture split
> Frontend integration setup guide valid/malformed payloads, JSON response helper, normalizer checks, and setup-guide client fail-closed runner를 `integration-guide-contracts.contract.test.ts`에서 `integration-guide-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Integration Guide Contract Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend remaining mutation response fixture split
> Frontend remaining worklog/comment/privacy/moderation/notification mutation malformed response cases and fail-closed runner를 `remaining-mutation-response-guards.contract.test.ts`에서 `remaining-mutation-response-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Remaining Mutation Response Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend settings profile save contract scenario move
> Frontend settings profile save partial/failure/network/success scenario runners를 `settings-profile-save.contract.test.ts`에서 existing `settings-profile-save.contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Settings Profile Save Contract Scenario Move 2026-06-18]]


> [!success] 2026-06-18 Frontend project summary adapter contract helper move
> Frontend project summary stats/avatar/privacy/route/malformed/public-visibility assertions를 `project-summary-adapters.contract.test.ts`에서 existing `project-summary-adapter-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Summary Adapter Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend notification URL contract helper move
> Frontend notification href/path-segment/external-url sanitizer assertions를 `notification-url-contracts.contract.test.ts`에서 existing `notification-url-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Notification URL Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend owner project detail contract helper move
> Frontend owner-aware project detail surface/request/normalization contract helpers를 `owner-project-detail-contracts.contract.test.ts`에서 existing `owner-project-detail-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Owner Project Detail Contract Helper Move 2026-06-18]]


> [!success] 2026-06-18 Frontend worklog card malformed adapter fixture split
> Frontend malformed worklog card source, multi-agent metrics, and viewer-state cases plus adapter mismatch assertion helper를 `worklog-card-malformed-adapter.contract.test.ts`에서 `worklog-card-malformed-adapter-fixtures.ts`로 분리했다. Existing `worklog-card-contract-fixtures.ts`가 187 pure LOC로 near-200 상태라 별도 malformed fixture module을 만들었다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Card Malformed Adapter Fixture Split 2026-06-18]]


> [!success] 2026-06-18 Frontend public user strict stats fixture split
> Frontend public user strict stats valid payload, malformed strict stats/viewer-state cases, API response helper, and fail-closed capture helper를 `public-user-strict-stats.contract.test.ts`에서 `public-user-strict-stats-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Public User Strict Stats Fixture Split 2026-06-18]]


> [!success] 2026-06-17 Frontend worklog card adapter expectation move
> Frontend worklog card adapter collection source, multi-agent metrics, hidden metrics, and viewer-state/social expectation helpers를 `worklog-card-adapter.contract.test.ts`에서 existing `worklog-card-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Card Adapter Expectation Move 2026-06-17]]


> [!success] 2026-06-17 Frontend worklog review action case move
> Frontend worklog review unpublish, comment-submit, and publish-control cases를 `worklog-review-action-contracts.contract.test.ts`에서 existing `worklog-review-action-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Review Action Case Move 2026-06-17]]


> [!success] 2026-06-17 Frontend ingestion token response guard fixture split
> Frontend malformed ingestion token response cases and JSON response helper를 `ingestion-token-response-guards.contract.test.ts`에서 `ingestion-token-response-guard-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Ingestion Token Response Guard Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend project stats strict field fixture split
> Frontend project stats valid payload, legacy alias malformed cases, and API response helper를 `project-stats-strict-fields.contract.test.ts`에서 `project-stats-strict-fields-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Stats Strict Field Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend worklog detail adapter fixture split
> Frontend valid worklog detail payload and malformed detail adapter cases를 `worklog-detail-adapter.contract.test.ts`에서 `worklog-detail-adapter-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Detail Adapter Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend moderation report contract fixture split
> Frontend moderation report request recording, response fixtures, and recorded-request assertions를 `moderation-report-contracts.contract.test.ts`에서 `moderation-report-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Moderation Report Contract Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend API response auth event helper move
> Frontend API response hardening auth-error action dispatch and window event-recorder helpers를 `api-response-hardening.contract.test.ts`에서 existing `api-response-hardening-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Response Auth Event Helper Move 2026-06-17]]


> [!success] 2026-06-17 Frontend settings profile save expectation move
> Frontend settings profile save scenario expectations를 `settings-profile-save.contract.test.ts`에서 existing `settings-profile-save.contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Settings Profile Save Expectation Move 2026-06-17]]


> [!success] 2026-06-17 Frontend comment response guard fixture split
> Frontend comment author payloads, valid list response, malformed response cases, and JSON response helper를 `comment-response-guards.contract.test.ts`에서 `comment-response-guard-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Comment Response Guard Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend API error diagnostic fixture split
> Frontend API error diagnostic bodies, response init fixtures, backend error envelope, and capture helper를 `api-error-diagnostics.contract.test.ts`에서 `api-error-diagnostics-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Error Diagnostic Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend security header contract fixture split
> Frontend static security header, IP-only server-test header, and CSP directive fixtures를 `security-headers.contract.test.ts`에서 `security-headers-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Security Header Contract Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend project mutation request expectation move
> Frontend project mutation request expectations를 `project-mutation-contracts.contract.test.ts`에서 existing `project-mutation-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Mutation Request Expectation Move 2026-06-17]]


> [!success] 2026-06-17 Frontend API fetch request header case move
> Frontend API fetch request header scenarios를 `api-fetch-request-hardening.contract.test.ts`에서 existing `api-fetch-request-hardening-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Fetch Request Header Case Move 2026-06-17]]


> [!success] 2026-06-17 Frontend CLI auth contract fixture split
> Frontend CLI auth response/request fixtures를 `cli-auth.contract.ts`에서 `cli-auth-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend CLI Auth Contract Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend API fetch timeout fixture split
> Frontend API timeout/cancellation helper fixtures를 `api-fetch-timeout-cancellation.contract.test.ts`에서 `api-fetch-timeout-cancellation-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Fetch Timeout Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend API request contract expectation move
> Frontend API request method/path/query expectations를 `api-request-contracts.contract.test.ts`에서 existing `api-request-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Request Contract Expectation Move 2026-06-17]]


> [!success] 2026-06-17 Frontend API response envelope case move
> Frontend API response envelope malformed case data를 `api-response-envelope-hardening.contract.test.ts`에서 existing `api-response-envelope-hardening-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Response Envelope Case Move 2026-06-17]]


> [!success] 2026-06-17 Frontend account project mutation response fixture split
> Frontend account/project mutation malformed response cases를 `account-project-mutation-response-guards.contract.test.ts`에서 `account-project-mutation-response-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Account Project Mutation Response Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend owner project detail fixture move
> Frontend owner-project detail wrapper/stat fixtures를 `owner-project-detail-contracts.contract.test.ts`에서 existing `owner-project-detail-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Owner Project Detail Fixture Move 2026-06-17]]


> [!success] 2026-06-17 Frontend API response hardening scenario move
> Frontend API response hardening auth response/scenario data를 `api-response-hardening.contract.test.ts`에서 existing `api-response-hardening-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Response Hardening Scenario Move 2026-06-17]]


> [!success] 2026-06-17 Frontend API fetch request hardening fixture split
> Frontend API fetch request hardening response stubs를 `api-fetch-request-hardening.contract.test.ts`에서 `api-fetch-request-hardening-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Fetch Request Hardening Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend leaderboard response fixture split
> Frontend leaderboard valid response/malformed cases를 `leaderboard-response-contracts.contract.test.ts`에서 `leaderboard-response-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Leaderboard Response Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend project schema variant malformed fixture move
> Frontend project schema variant malformed cases를 `project-schema-variants-malformed-strict-fields.contract.test.ts`에서 existing `project-schema-variant-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Schema Variant Malformed Fixture Move 2026-06-17]]


> [!success] 2026-06-17 Frontend worklog mutation body fixture split
> Frontend worklog mutation response/request body fixtures를 `worklog-mutation-body-contracts.contract.test.ts`에서 `worklog-mutation-body-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Mutation Body Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend ingestion token mutation fixture split
> Frontend ingestion token mutation response/request fixtures를 `ingestion-token-mutation-contracts.contract.test.ts`에서 `ingestion-token-mutation-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Ingestion Token Mutation Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend project malformed response fixture move
> Frontend project malformed list/detail response cases를 `project-malformed-response-contracts.contract.test.ts`에서 existing `project-response-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Malformed Response Fixture Move 2026-06-17]]


> [!success] 2026-06-17 Frontend privacy scan strict field fixture move
> Frontend privacy scan strict-field valid review/cases를 `privacy-scan-strict-fields.contract.test.ts`에서 existing `worklog-review-response-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Privacy Scan Strict Field Fixture Move 2026-06-17]]


> [!success] 2026-06-17 Frontend collection evidence malformed fixture move
> Frontend collection evidence malformed review builders/cases를 `collection-evidence-malformed.contract.test.ts`에서 existing `collection-evidence-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Collection Evidence Malformed Fixture Move 2026-06-17]]


> [!success] 2026-06-17 Frontend worklog review strict field fixture move
> Frontend worklog review valid response and malformed strict-field cases를 `worklog-review-strict-fields.contract.test.ts`에서 existing `worklog-review-response-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Review Strict Field Fixture Move 2026-06-17]]


> [!success] 2026-06-17 Frontend metadata strict field fixture split
> Frontend metadata compatibility fixtures/cases를 `metadata-strict-fields.contract.test.ts`에서 `metadata-strict-fields-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Metadata Strict Field Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend API response envelope fixture split
> Frontend API response envelope helper/case fixtures를 `api-response-envelope-hardening.contract.test.ts`에서 `api-response-envelope-hardening-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Response Envelope Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend settings profile save fixture move
> Frontend settings profile save form fixtures를 `settings-profile-save.contract.test.ts`에서 existing `settings-profile-save.contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Settings Profile Save Fixture Move 2026-06-17]]


> [!success] 2026-06-17 Frontend worklog card adapter fixture move
> Frontend worklog card adapter variant payloads를 `worklog-card-adapter.contract.test.ts`에서 existing `worklog-card-contract-fixtures.ts`로 이동했다. Baseline `npm run test:contracts` 통과 후 이동했고, post-move `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Card Adapter Fixture Move 2026-06-17]]


> [!success] 2026-06-17 Frontend public user leaderboard fixture split
> Frontend public user and leaderboard row fixtures를 `public-user-leaderboard-contracts.contract.test.ts`에서 `public-user-leaderboard-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Public User Leaderboard Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend user account response guard fixture split
> Frontend user/account response payload and malformed cases를 `user-account-response-guards.contract.test.ts`에서 `user-account-response-guard-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend User Account Response Guard Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend me client mutation fixture split
> Frontend me-client mutation request capture helpers/profile/token fixtures를 `me-client-mutation-contracts.contract.test.ts`에서 `me-client-mutation-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Me Client Mutation Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend project mutation contract fixture split
> Frontend project mutation request bodies/expected JSON/response helper를 `project-mutation-contracts.contract.test.ts`에서 `project-mutation-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Mutation Contract Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend auth next fixture split
> Frontend OAuth next path/query/hash cases를 `auth-next-contracts.contract.test.ts`에서 `auth-next-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Auth Next Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend worklog review action fixture split
> Frontend worklog review action privacy finding/review preview fixtures를 `worklog-review-action-contracts.contract.test.ts`에서 `worklog-review-action-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Review Action Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend project summary adapter fixture split
> Frontend project summary adapter fixtures and malformed row cases를 `project-summary-adapters.contract.test.ts`에서 `project-summary-adapter-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Summary Adapter Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend CLI auth malformed response fixture split
> Frontend malformed CLI auth response cases를 `cli-auth-malformed-response.contract.test.ts`에서 `cli-auth-malformed-response-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend CLI Auth Malformed Response Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend identity profile fixture split
> Frontend identity/profile user and comment fixtures를 `identity-profile-contracts.contract.test.ts`에서 `identity-profile-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Identity Profile Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend API response hardening fixture split
> Frontend API response hardening fixtures/helpers를 `api-response-hardening.contract.test.ts`에서 `api-response-hardening-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Response Hardening Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend notification URL fixture split
> Frontend notification actor fixtures and unsafe external URL cases를 `notification-url-contracts.contract.test.ts`에서 `notification-url-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Notification URL Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend API request fixture split
> Frontend API request contract response stubs/project fixture를 `api-request-contracts.contract.test.ts`에서 `api-request-contract-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Request Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend worklog action response guard split
> Frontend worklog review response fixture and action response fail-closed cases를 `worklog-review-action-response-guards.contract.test.ts`에서 `worklog-review-response-fixtures.ts`와 `worklog-action-malformed-response-guards.contract.test.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Action Response Guard Split 2026-06-17]]


> [!success] 2026-06-17 Frontend worklog detail strict field fixture split
> Frontend worklog detail/card strict-field fixtures를 `worklog-detail-strict-fields.contract.test.ts`에서 `worklog-detail-strict-fields-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Detail Strict Field Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend explore strict field fixture split
> Frontend explore strict-field fixtures를 `explore-strict-fields.contract.test.ts`에서 `explore-strict-fields-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Explore Strict Field Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend owner project detail fixture split
> Frontend owner-project detail response type/factory fixtures를 `owner-project-detail-contracts.contract.test.ts`에서 `owner-project-detail-fixtures.ts`로 분리했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Owner Project Detail Fixture Split 2026-06-17]]


> [!success] 2026-06-17 Frontend remaining read response guard split
> Frontend remaining read-model valid payload checks and malformed fail-closed cases를 `remaining-read-response-guards.contract.test.ts`, `remaining-read-malformed-response-guards.contract.test.ts`, `remaining-read-response-fixtures.ts`로 분리하고 local contract source registry에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Remaining Read Response Guard Split 2026-06-17]]


> [!success] 2026-06-17 Frontend contract runner source registry split
> Frontend local contract runner의 growing source registry를 `scripts/run-contract-tests.mjs`에서 `scripts/contract-test-sources.mjs`로 분리해 runner를 orchestration-only 파일로 축소했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Contract Runner Source Registry Split 2026-06-17]]


> [!success] 2026-06-16 Frontend API fetch timeout contract split
> Frontend API timeout/caller cancellation checks를 near-warning `api-fetch-request-hardening.contract.test.ts`에서 `api-fetch-timeout-cancellation.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Fetch Timeout Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend API pagination request contract split
> Frontend cursor pagination request checks를 near-warning `api-request-contracts.contract.test.ts`에서 `api-pagination-request-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Pagination Request Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend settings profile validation save contract split
> Frontend settings profile validation/no-API save preflight checks를 near-warning `settings-profile-save.contract.test.ts`에서 `settings-profile-validation-save.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Settings Profile Validation Save Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend me settings mutation contract split
> Frontend privacy/notification settings mutation checks를 near-warning `me-client-mutation-contracts.contract.test.ts`에서 `me-settings-mutation-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Me Settings Mutation Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend project schema variant contract split
> Frontend project schema variant fixtures and malformed strict-field cases를 near-warning `project-schema-variants-strict-fields.contract.test.ts`에서 `project-schema-variant-fixtures.ts`와 `project-schema-variants-malformed-strict-fields.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Schema Variant Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend project mutation response contract split
> Frontend project mutation response fixture and strict response fail-closed check를 near-warning `project-mutation-contracts.contract.test.ts`에서 `project-mutation-response-fixtures.ts`와 `project-mutation-response-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Mutation Response Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend project response contract split
> Frontend project response fixtures and malformed response fail-closed cases를 near-warning `project-response-contracts.contract.test.ts`에서 `project-response-fixtures.ts`와 `project-malformed-response-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Response Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend worklog card adapter contract split
> Frontend worklog card adapter valid normalization checks와 malformed source/metrics/viewer-state fail-closed cases를 near-warning `worklog-card-adapter.contract.test.ts`에서 `worklog-card-malformed-adapter.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Card Adapter Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend worklog card response guard split
> Frontend worklog card list response fixtures and malformed row fail-closed cases를 near-warning `worklog-card-response-guards.contract.test.ts`에서 `worklog-card-response-fixtures.ts`와 `worklog-card-malformed-response-guards.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Card Response Guard Split 2026-06-16]]


> [!success] 2026-06-16 Frontend collection evidence contract split
> Frontend collection evidence valid display checks and malformed fail-closed cases를 near-warning `collection-evidence.contract.test.ts`에서 `collection-evidence-fixtures.ts`와 `collection-evidence-malformed.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Collection Evidence Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend worklog detail response guard split
> Frontend worklog detail valid fixtures and malformed fail-closed cases를 near-warning `worklog-detail-response-guards.contract.test.ts`에서 `worklog-detail-response-fixtures.ts`와 `worklog-detail-malformed-response-guards.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Detail Response Guard Split 2026-06-16]]


> [!success] 2026-06-16 Frontend CLI auth malformed response contract split
> Frontend CLI auth malformed session/approve/exchange response fail-closed cases를 warning-band `cli-auth.contract.ts`에서 `cli-auth-malformed-response.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend CLI Auth Malformed Response Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend search/explore response guard split
> Frontend search/explore nested response guard checks를 warning-band `search-explore-response-guards.contract.test.ts`에서 `search-response-guards.contract.test.ts`와 `explore-response-guards.contract.test.ts`로 분리하고 shared fixture module 및 local contract runner를 업데이트했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Search Explore Response Guard Split 2026-06-16]]


> [!success] 2026-06-16 Frontend project mutation form contract split
> Frontend project mutation form serializer/null-clear semantics를 warning-band `project-mutation-contracts.contract.test.ts`에서 `project-mutation-form-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Project Mutation Form Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend API response envelope hardening split
> Frontend OkResponse/DataResponse/ListResponse envelope hardening checks를 warning-band `api-response-hardening.contract.test.ts`에서 `api-response-envelope-hardening.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Response Envelope Hardening Split 2026-06-16]]


> [!success] 2026-06-16 Frontend auth/theme/social contract split
> Final auth-gated action intent, optimistic social action state, and theme bootstrap checks를 `api-contract.test.ts`에서 `auth-theme-social-contracts.contract.test.ts`로 분리하고 old omnibus file을 제거했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Auth Theme Social Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend API error/list contract split
> Frontend API error display safety and malformed list-envelope fallback checks를 oversized `api-contract.test.ts`에서 `api-error-list-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Error List Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend notification URL contract split
> Frontend notification route-building, dynamic path segment encoding, and external URL sanitizer checks를 oversized `api-contract.test.ts`에서 `notification-url-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Notification URL Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend public user leaderboard contract split
> Frontend public user parser and leaderboard row guards를 oversized `api-contract.test.ts`에서 `public-user-leaderboard-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Public User Leaderboard Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend worklog review action contract split
> Frontend publish/unpublish/comment predicates and privacy preview safety checks를 oversized `api-contract.test.ts`에서 `worklog-review-action-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Worklog Review Action Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend auth.me contract split
> Frontend `auth.me` payload normalization checks를 oversized `api-contract.test.ts`에서 `auth-me-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Auth Me Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend API surface contract split
> Frontend direct worklog mutation body, route-client availability, search type, and settings ingestion token shape checks를 oversized `api-contract.test.ts`에서 `api-surface-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend API Surface Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend feed filter contract split
> Frontend feed sort/time/scope/tag URL contract checks를 oversized `api-contract.test.ts`에서 `feed-filter-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Feed Filter Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend list merge contract split
> Frontend cursor pagination merge and project result key checks를 oversized `api-contract.test.ts`에서 `list-merge-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend List Merge Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend URL navigation contract split
> Frontend `review_base_url` normalization, worklog/project/dashboard URL builders, and share permalink checks를 oversized `api-contract.test.ts`에서 `url-navigation-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend URL Navigation Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend auth next contract split
> Frontend OAuth `next` path sanitization and GitHub OAuth URL encoding checks를 oversized `api-contract.test.ts`에서 `auth-next-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Auth Next Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend identity profile contract split
> Frontend user identity/avatar/profile link/comment-author checks를 oversized `api-contract.test.ts`에서 `identity-profile-contracts.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, `git diff --check`, changed-file LOC/no-excuse audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Identity Profile Contract Split 2026-06-16]]


> [!success] 2026-06-16 Frontend security headers contract split
> Frontend security header/CSP checks를 oversized `api-contract.test.ts`에서 `security-headers.contract.test.ts`로 분리하고 local contract runner에 등록했다. Baseline `npm run test:contracts` 통과 후 분리했고, post-split `npm run test:contracts`, `npm run lint`, changed-file LOC audit를 통과했다. 런타임 기능 추가 없음, 서버/인프라/CI/CD 변경 및 배포 없음.
> - [[Frontend Security Headers Contract Split 2026-06-16]]


> [!success] 2026-06-12 CLI share collection execution split
> `agentfeed share`의 project config validation, collection window resolution, dry-run credential skip, draft collection, sanitize/write, warning merge를 `share-collection-execution` helper로 분리했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 79 tests, full `npm test -- --run` 818 tests, 실제 temp project CLI smoke(dry-run JSON no API call, confirmation no-network pause, fake API upload) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 사용자 배포 요청은 활성 목표의 금지 규칙 때문에 수행하지 않았고 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Share Collection Execution Split 2026-06-12]]


> [!success] 2026-06-12 CLI share upload execution split
> `agentfeed share`의 upload confirmation gate, preflight, publish API call, saved draft sanitize/reread, cursor mark, review URL handoff policy를 `share-upload-execution` helper로 분리했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 82 tests, full `npm test -- --run` 816 tests, 실제 temp project + local fake API CLI smoke(confirmation no-network pause, `share --yes --json --no-clipboard --no-open-review`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Share Upload Execution Split 2026-06-12]]


> [!success] 2026-06-12 CLI publish execution split
> `agentfeed publish`의 confirmation gate, credential/token guidance, upload preflight, publish API call, saved-draft reread, review URL handoff policy를 `publish-execution` helper로 분리했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 80 tests, full `npm test -- --run` 813 tests, 실제 temp project + local fake API CLI smoke(confirmation no-network pause, `publish --yes --json --no-clipboard --no-open-review`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Publish Execution Split 2026-06-12]]


> [!success] 2026-06-12 CLI open execution split
> `agentfeed open`의 saved review URL trust validation, invalid API URL warning capture, browser-open fallback warning 조립을 `open-execution` helper로 분리했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 49 tests, full `npm test -- --run` 810 tests, 실제 temp project CLI smoke(`open --json`, invalid API URL human fallback, invalid review URL) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Open Execution Split 2026-06-12]]


> [!success] 2026-06-12 CLI open draft resolver split
> `agentfeed open`의 draft id/latest 선택, pending/no-uploaded guidance, malformed draft skip을 `open-draft-resolver` helper로 분리했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 45 tests, full `npm test -- --run` 806 tests, 실제 temp project CLI smoke(`open --latest --json`, pending `open --id`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Open Draft Resolver Split 2026-06-12]]


> [!success] 2026-06-12 CLI preview execution split
> `agentfeed preview`의 local draft sanitize/persist와 remote compatibility preflight/preview execution을 `preview-execution` helper로 분리했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 81 tests, full `npm test -- --run` 801 tests, 실제 temp project CLI smoke(`preview`, `preview --remote --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Preview Execution Split 2026-06-12]]


> [!success] 2026-06-12 CLI scan command execution split
> `agentfeed scan`의 path inspect-only, draft dry-run, saved draft redaction/write execution을 `scan-command` helper로 분리했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 79 tests, full `npm test -- --run` 798 tests, 실제 temp project CLI smoke(`scan --dry-run`, `scan --json`, `scan --path --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Scan Command Execution Split 2026-06-12]]


> [!success] 2026-06-12 CLI draft list row builder split
> `agentfeed drafts`의 saved draft row construction, title redaction, invalid draft fallback을 `draft-list-rows` helper로 분리했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 112 tests, full `npm test -- --run` 795 tests, 실제 temp project CLI smoke(`drafts`, `drafts --json`: redacted single-line title, malformed invalid row) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Draft List Row Builder Split 2026-06-12]]


> [!success] 2026-06-12 CLI runtime policy split
> CI 환경 감지, upload confirmation 요구, upload 후 review open 정책을 `runtime-policy` helper로 분리했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 141 tests, full `npm test -- --run` 793 tests, 실제 temp project + local fake API/fake browser CLI smoke(CI auto-open suppression, explicit `--open-review`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Runtime Policy Split 2026-06-12]]


> [!success] 2026-06-12 CLI auth token input split
> `agentfeed login`의 token input method 판정과 보안 recovery 문구를 `auth-token-input` helper로 분리했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 210 tests, full `npm test -- --run` 786 tests, 실제 CLI smoke(`login --json`, empty `--token-stdin`, unsafe argv token refusal) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Auth Token Input Split 2026-06-12]]



> [!success] 2026-06-12 CLI diagnostic credentials split
> invalid `AGENTFEED_API_BASE_URL` 상태에서도 status/doctor가 environment token provenance와 recovery guidance를 유지하도록 diagnostic credential helper로 분리했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 70 tests, full `npm test -- --run` 779 tests, 실제 temp project CLI smoke(`status --json`, `doctor --json` with invalid API URL) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Diagnostic Credentials Split 2026-06-12]]



> [!success] 2026-06-12 CLI upload preflight split
> upload/credential-save 전 API compatibility 및 ingestion token preflight recovery를 `upload-preflight` helper로 분리해 compatibility → token → ingest 차단 순서를 테스트로 고정했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 265 tests, full `npm test -- --run` 774 tests, 실제 temp project + local fake API CLI smoke(metadata incompatibility, token 401) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/개인서버 배포/infra/CICD 작업 없음.
> - [[CLI Upload Preflight Split 2026-06-12]]




> [!success] 2026-06-12 CLI review handoff policy split
> review URL trust validation, clipboard/browser side-effect policy, and handoff formatting ownership을 `review-handoff` helper로 통합해 handoff 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 71 tests, full `npm test -- --run` 768 tests, 실제 temp project + local fake API + fake `pbcopy`/`open` CLI smoke(`share --json --clipboard --open-review`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Review Handoff Policy Split 2026-06-12]]



> [!success] 2026-06-12 CLI publish output split
> `agentfeed publish`의 JSON payload 및 human upload result rendering을 `publish-output` helper로 분리해 direct publish 출력 계약을 테스트로 고정했다. Red test 2회 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 62 tests, full `npm test -- --run` 765 tests, 실제 temp project + local fake API CLI smoke(`publish --json`, `publish` reused human output) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Publish Output Split 2026-06-12]]



> [!success] 2026-06-12 CLI share local output split
> `agentfeed share`의 dry-run/token-missing JSON payload 및 human next-action rendering을 `share-output` helper로 분리해 local share 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, `npm run typecheck`, focused Vitest 64 tests, full `npm test -- --run` 763 tests, 실제 temp project CLI smoke(`share --dry`, `share --dry --json`, token-missing `share --yes --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Share Local Output Split 2026-06-12]]


> [!success] 2026-06-12 CLI open error guidance split
> `agentfeed open`의 pending/no-drafts/no-uploaded draft error guidance를 `open-command` helper로 분리해 review URL 부재 오류 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 78 tests, full `npm test -- --run` 759 tests, 실제 temp project CLI smoke(`open --latest` no drafts, `open --id` pending draft, `open --latest` no uploaded) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Open Error Guidance Split 2026-06-12]]



> [!success] 2026-06-12 CLI discard output split
> `agentfeed discard`의 confirmation 및 confirmed-delete human-readable rendering을 `discard-command` helper로 분리해 삭제 전/후 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 24 tests, full `npm test -- --run` 756 tests, 실제 temp project CLI smoke(`discard`, `discard --json`, `discard --yes`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Discard Output Split 2026-06-12]]



> [!success] 2026-06-12 CLI open human renderer split
> `agentfeed open`의 review URL human-readable rendering을 `open-command` helper로 분리해 manual-open fallback과 browser-open success 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 78 tests, full `npm test -- --run` 754 tests, 실제 temp project CLI smoke(`open`, `open --json`, fake browser success) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Open Human Renderer Split 2026-06-12]]



> [!success] 2026-06-12 CLI doctor output split
> `agentfeed doctor`의 JSON payload 및 human-readable diagnostics rendering을 `doctor-output` helper로 분리해 doctor 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 48 tests, full `npm test -- --run` 752 tests, 실제 temp project CLI smoke(`doctor`, `doctor --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Doctor Output Split 2026-06-12]]



> [!success] 2026-06-12 CLI auth output split
> `agentfeed login` / `agentfeed rotate`의 credential result human-readable rendering을 `auth-output` helper로 분리해 인증 결과 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 207 tests, full `npm test -- --run` 749 tests, 실제 temp HOME CLI smoke(`login --token-stdin --no-save` human/JSON) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Auth Output Split 2026-06-12]]



> [!success] 2026-06-12 CLI hook output split
> `agentfeed hook install/uninstall claude-code`의 JSON payload 및 human-readable lifecycle rendering을 `hook-output` helper로 분리해 hook 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 153 tests, full `npm test -- --run` 747 tests, 실제 temp project CLI smoke(`hook install --dry-run`, `hook install`, `hook uninstall`, JSON variants) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Hook Output Split 2026-06-12]]



> [!success] 2026-06-12 CLI init output split
> `agentfeed init`의 JSON payload 및 human-readable setup checklist rendering을 `init-output` helper로 분리해 init 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 57 tests, full `npm test -- --run` 743 tests, 실제 temp project CLI smoke(`init`, `init --json`, `init --force`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Init Output Split 2026-06-12]]




> [!success] 2026-06-12 CLI collect output split
> `agentfeed collect`의 JSON payload 및 human-readable draft report rendering을 `collect-output` helper로 분리해 collect 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 82 tests, full `npm test -- --run` 739 tests, 실제 temp git project CLI smoke(`collect --explain`, `collect --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Collect Output Split 2026-06-12]]



> [!success] 2026-06-12 CLI logout output split
> `agentfeed logout`의 JSON payload 및 human-readable security checklist rendering을 `logout-output` helper로 분리해 logout 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 76 tests, full `npm test -- --run` 737 tests, 실제 temp HOME CLI smoke(`logout`, `logout --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Logout Output Split 2026-06-12]]



> [!success] 2026-06-12 CLI status output split
> `agentfeed status`의 JSON payload 및 human-readable output rendering을 `status-output` helper로 분리하고 credential/API/cursor provenance label을 `diagnostic-formatters`로 공유했다. Red test 확인 후 `npm run build`, focused Vitest 43 tests, full `npm test -- --run` 734 tests, 실제 temp project CLI smoke(`status`, `status --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Status Output Split 2026-06-12]]



> [!success] 2026-06-12 CLI upload output split
> `agentfeed share --yes` / `agentfeed publish`의 upload completion 및 confirmation human output rendering을 `upload-output` helper로 분리해 upload 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 188 tests, full `npm test -- --run` 732 tests, 실제 temp project CLI smoke(`publish` confirmation output) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Upload Output Split 2026-06-12]]



> [!success] 2026-06-12 CLI draft list output split
> `agentfeed drafts`의 summary, JSON payload, human-readable list rendering을 `draft-list-output` helper로 분리해 draft list 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 61 tests, full `npm test -- --run` 730 tests, 실제 temp project CLI smoke(`drafts` human/JSON) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Draft List Output Split 2026-06-12]]



> [!success] 2026-06-12 CLI privacy scan output split
> `agentfeed scan`의 JSON payload와 human-readable privacy scan report 조립을 `privacy-scan-output` helper로 분리해 scan 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 51 tests, full `npm test -- --run` 727 tests, 실제 temp git project CLI smoke(`scan --path` human/JSON) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Privacy Scan Output Split 2026-06-12]]


> [!success] 2026-06-12 CLI preview human renderer split
> `agentfeed preview` 및 `preview --remote`의 human-readable line rendering을 `preview-command` helper로 분리해 preview 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 58 tests, full `npm test -- --run` 725 tests, 실제 temp project CLI smoke(local/remote preview human output) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Preview Human Renderer Split 2026-06-12]]


> [!success] 2026-06-12 CLI preview payload split
> `agentfeed preview --json` 및 `preview --remote --json`의 local/remote payload 조립을 `preview-command` helper로 분리해 preview JSON 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 56 tests, full `npm test -- --run` 723 tests, 실제 temp project CLI smoke(local/remote preview JSON) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Preview Payload Split 2026-06-12]]


> [!success] 2026-06-12 CLI open payload split
> `agentfeed open --json`의 review URL/opened/warnings/next_actions payload 조립을 `open-command` helper로 분리해 open JSON 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 60 tests, full `npm test -- --run` 721 tests, 실제 temp project CLI smoke(`open --id draft_open --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Open Payload Split 2026-06-12]]


> [!success] 2026-06-12 CLI discard payload split
> `agentfeed discard`의 confirmation/complete JSON payload 조립을 `discard-command` helper로 분리해 discard JSON 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 60 tests, full `npm test -- --run` 719 tests, 실제 temp project CLI smoke(`discard --json`, `discard --yes --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Discard Payload Split 2026-06-12]]


> [!success] 2026-06-12 CLI version command split
> `agentfeed version`의 plain/JSON stdout 결정 로직을 `version-command` helper로 분리해 version command 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 45 tests, full `npm test -- --run` 717 tests, CLI smoke(`version`, `--version`, `-v`, `version --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Version Command Split 2026-06-12]]


> [!success] 2026-06-12 CLI completion command split
> `agentfeed completion`의 help/script/unsupported-shell 결정 로직을 `completion-command` helper로 분리해 completion command 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 42 tests, full `npm test -- --run` 715 tests, CLI smoke(`completion --help`, `completion zsh`, `completion powershell`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Completion Command Split 2026-06-12]]


> [!success] 2026-06-12 CLI commands output renderer split
> `agentfeed commands` JSON/human output 조립을 `commands-output-renderer` helper로 분리해 commands catalog 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 40 tests, full `npm test -- --run` 712 tests, CLI smoke(`commands`, `commands --json`, `--help`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Commands Output Renderer Split 2026-06-12]]


> [!success] 2026-06-12 CLI guided next command renderer split
> next-action command line 렌더링을 `guided-next-command-renderer` helper로 분리해 단일 command와 recommended-order 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 41 tests, full `npm test -- --run` 710 tests, CLI smoke(`commands`, `--help`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Guided Next Command Renderer Split 2026-06-12]]


> [!success] 2026-06-12 CLI root help renderer split
> root help sections를 `root-help-renderer` helper로 분리해 root help 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 39 tests, full `npm test -- --run` 707 tests, CLI smoke(`--help`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Root Help Renderer Split 2026-06-12]]


> [!success] 2026-06-12 CLI command help text split
> command-specific help text map을 `command-help-core-text` / `command-help-workflow-text` / `command-help-text` facade로 분리해 `index.ts`의 정적 help content 책임을 줄이고 help 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 41 tests, full `npm test -- --run` 706 tests, CLI smoke(`help token rotate`, `share --help`, `completion --help`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Command Help Text Split 2026-06-12]]



> [!success] 2026-06-12 CLI command argument validator split
> command argument validation loop를 `command-argument-validator` helper로 분리해 unknown command/option, bare `--`, positional validation, conflict validation 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 41 tests, full `npm test -- --run` 703 tests, CLI smoke(`share --dry --yes`, `share --opne-review`, `token rotate browser`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Command Argument Validator Split 2026-06-12]]



> [!success] 2026-06-12 CLI command arg specs split
> command별 flags/value options/conflicts/positional validation과 completion shell list를 `command-arg-specs` helper로 분리해 parser/completion/catalog가 공유하는 argument metadata 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 41 tests, full `npm test -- --run` 700 tests, CLI smoke(`commands --json`, `completion zsh`, `token rotate browser`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Command Arg Specs Split 2026-06-12]]



> [!success] 2026-06-12 CLI command definitions split
> public command order/descriptions/examples/usage overrides/groups/known-command set을 `command-definitions` helper로 분리해 help/catalog/completion/parser가 공유하는 command metadata 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 40 tests, full `npm test -- --run` 697 tests, CLI smoke(`commands --json`, `--help`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Command Definitions Split 2026-06-12]]



> [!success] 2026-06-12 CLI human command catalog renderer split
> human-readable command catalog/guided workflow rendering을 `command-catalog-renderer` helper로 분리해 `agentfeed commands` 및 root help 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 40 tests, full `npm test -- --run` 695 tests, CLI smoke(`commands`, `--help`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Human Command Catalog Renderer Split 2026-06-12]]



> [!success] 2026-06-12 CLI command catalog helper split
> `commands --json` entry/option detail/conflict/completion word formatting을 `command-catalog` helper로 분리해 command catalog JSON 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 40 tests, full `npm test -- --run` 693 tests, CLI smoke(`commands --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Command Catalog Helper Split 2026-06-12]]



> [!success] 2026-06-12 CLI completion script renderer split
> zsh/bash/fish completion script rendering을 `completion-script-renderer` helper로 분리해 `agentfeed completion <shell>` 출력 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 39 tests, full `npm test -- --run` 691 tests, CLI smoke(`completion zsh`, `completion bash`, `completion fish`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Completion Script Renderer Split 2026-06-12]]



> [!success] 2026-06-12 CLI completion option metadata split
> completion option description/value-required/placeholder/choices/file-hint metadata를 `completion-option-metadata` helper로 분리해 zsh/fish completion 및 `commands --json` option_details 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 39 tests, full `npm test -- --run` 690 tests, CLI smoke(`completion zsh`, `completion fish`, `commands --json` option_details) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Completion Option Metadata Split 2026-06-12]]



> [!success] 2026-06-12 CLI completion vocabulary split
> completion option/help-topic/command-word generation을 `completion-vocabulary` helper로 분리해 zsh/bash/fish completion 및 `commands --json` completion_words 계약을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 39 tests, full `npm test -- --run` 689 tests, CLI smoke(`completion zsh`, `commands --json` completion_words) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Completion Vocabulary Split 2026-06-12]]




> [!success] 2026-06-12 CLI trailing help alias split
> `agentfeed <command> help` 및 `agentfeed token rotate help` 감지를 `trailing-help-alias` helper로 분리해 oversized `src/cli/index.ts`의 alias parsing 책임을 줄였다. Red test 확인 후 `npm run build`, focused Vitest 39 tests, full `npm test -- --run` 688 tests, CLI smoke(`status help`, `token rotate help`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Trailing Help Alias Split 2026-06-12]]



> [!success] 2026-06-12 CLI parser helper boundary split
> bare `--` recovery `Error` 생성과 `--help`/`-h` 감지를 각각 `bare-double-dash-error` / `help-flag` helper로 분리해 oversized `src/cli/index.ts` parser utility 책임을 줄였다. Red tests 확인 후 `npm run build`, focused Vitest 56 tests, full `npm test -- --run` 687 tests, CLI smoke(`status --`, `status --help`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Parser Helper Boundary Split 2026-06-12]]



> [!success] 2026-06-12 CLI leading option error factory split
> leading option `Error` 생성 책임을 oversized `src/cli/index.ts`에서 `src/cli/leading-option-error.ts`로 분리하고 command-first recovery wording을 테스트로 고정했다. Red test 확인 후 `npm run build`, focused Vitest 42 tests, full `npm test -- --run` 685 tests, CLI smoke(`--json status`, `--source codex share`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Leading Option Error Factory Split 2026-06-12]]



> [!success] 2026-06-12 CLI unknown command error factory split
> unknown command `Error` 생성 책임을 oversized `src/cli/index.ts`에서 `src/cli/unknown-command-error.ts`로 분리하고 모든 unknown-command 경로가 같은 helper를 쓰도록 정리했다. Red test 확인 후 `npm run build`, focused Vitest 40 tests, full `npm test -- --run` 684 tests, CLI smoke(`statsu`, `statsu --help`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Unknown Command Error Factory Split 2026-06-12]]



> [!success] 2026-06-11 CLI unknown option error factory split
> unknown option `Error` 생성 책임을 oversized `src/cli/index.ts`에서 `src/cli/unknown-option-error.ts`로 분리하고 long/short unknown option 경로가 같은 helper를 쓰도록 정리했다. Red test 확인 후 `npm run build`, focused Vitest 41 tests, full `npm test -- --run` 683 tests, CLI smoke(`share --opne-review`, `status -x`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Unknown Option Error Factory Split 2026-06-11]]



> [!success] 2026-06-11 CLI long option unknown recovery laziness
> `consumeLongOption`의 unknown-option recovery를 eager `Error` 생성에서 lazy factory로 바꿔 정상 value/flag long option 경로가 쓰지 않는 복구 오류를 만들지 않게 했다. Red test 확인 후 `npm run build`, focused Vitest 42 tests, full `npm test -- --run` 682 tests, CLI smoke(`share --opne-review`, `status --json=true`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Long Option Unknown Recovery Laziness 2026-06-11]]



> [!success] 2026-06-11 CLI long option consumption refactor
> long option의 value/flag/unknown dispatch와 consumption을 `classifyLongOption` / `consumeLongOption`으로 분리해 `validateCommandArgs` inline branch를 줄였다. Red tests 확인 후 `npm run build`, focused Vitest 50 tests, full `npm test -- --run` 682 tests, CLI smoke(`login --api-base-url=... --json`, `status --json=true`, `share --opne-review`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Long Option Consumption Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI command option sets refactor
> command별 flags/valueOptions를 parser lookup set으로 구성하는 책임을 `buildCommandOptionSets`로 분리해 `validateCommandArgs`의 option set 초기화 branch를 줄였다. Red test 확인 후 `npm run build`, focused Vitest 42 tests, full `npm test -- --run` 678 tests, CLI smoke(`status --help`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Command Option Sets Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI conflict validation refactor
> command conflict validation 결과를 throw하는 책임을 `assertNoConflictingOptions`로 분리해 `validateCommandArgs`의 post-loop conflict branch를 줄였다. Red test 확인 후 `npm run build`, focused Vitest 42 tests, full `npm test -- --run` 676 tests, CLI smoke(`share --dry --yes`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Conflict Validation Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI positional validation refactor
> command positional validation 결과를 throw하는 책임을 `assertValidPositionals`로 분리해 `validateCommandArgs`의 post-loop validation branch를 줄였다. Red test 확인 후 `npm run build`, focused Vitest 44 tests, full `npm test -- --run` 674 tests, CLI smoke(`status extra`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Positional Validation Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI short option consumption refactor
> short option known-flag consumption 결정을 `consumeShortOption`으로 분리해 `validateCommandArgs`의 inline `flags.has(raw)` branch를 줄였다. Red test 확인 후 `npm run build`, focused Vitest 46 tests, full `npm test -- --run` 672 tests, CLI smoke(`status -x`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Short Option Consumption Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI flag option consumption refactor
> flag option의 inline value rejection(`--flag=value`)을 `consumeFlagOption`으로 분리하고, value/flag option consumption을 `option-consumption` module로 묶었다. Red test 확인 후 `npm run build`, focused Vitest 44 tests, full `npm test -- --run` 670 tests, CLI smoke(`status --json=true`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Flag Option Consumption Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI value option consumption refactor
> value option의 inline/separate value 소비와 missing-value rejection을 `consumeValueOption`으로 분리해 `validateCommandArgs`가 typed `nextIndex` result를 받도록 정리했다. Red test 확인 후 `npm run build`, focused Vitest 42 tests, full `npm test -- --run` 668 tests, CLI JSON smoke(`login --api-base-url --json`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Value Option Consumption Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI long option token parser refactor
> raw long option token parsing(`--name[=value]`)을 `parseLongOptionToken`으로 분리해 `validateCommandArgs`가 typed token을 소비하도록 정리했다. Red test 확인 후 `npm run build`, focused Vitest 39 tests, full `npm test -- --run` 665 tests, CLI surface smoke(`login --api-base-url=`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Long Option Token Parser Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI unknown option candidate recovery refactor
> unknown option suggestion 후보(`flags + valueOptions + --help/-h`) 조립을 `unknownCommandOptionMessage`로 분리해 `unknownOptionError`의 inline candidate assembly를 줄였다. Red test 확인 후 `npm run build`, focused Vitest 54 tests, full `npm test -- --run` 664 tests, CLI surface smoke(`share --opne-review`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Unknown Option Candidate Recovery Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI conflict recovery decision refactor
> 상호 배타적 option conflict detection + recovery message 결정을 `conflictingOptionsMessage`로 분리해 `validateCommandArgs`의 conflict loop/message assembly를 줄였다. Red test 확인 후 `npm run build`, focused Vitest 53 tests, full `npm test -- --run` 663 tests, CLI surface smoke(`share --dry --yes`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Conflict Recovery Decision Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI option value rejection recovery refactor
> 값을 받지 않는 flag에 `=` 값이 붙은 경우의 recovery를 `optionDoesNotAcceptValueMessage`로 분리해 `validateCommandArgs`의 inline message assembly를 줄였다. Red test 확인 후 `npm run build`, focused Vitest 52 tests, full `npm test -- --run` 662 tests, CLI surface smoke(`status --json=true`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Option Value Rejection Recovery Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI option value recovery refactor
> 값이 필요한 option의 missing-value recovery를 `optionRequiresValueMessage`로 분리해 `validateCommandArgs`의 inline message assembly를 줄였다. Red test 확인 후 `npm run build`, focused Vitest 51 tests, full `npm test -- --run` 661 tests, CLI surface smoke(`login --api-base-url`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Option Value Recovery Refactor 2026-06-11]]



> [!success] 2026-06-11 CLI bare double dash recovery refactor
> command parser의 bare `--` recovery를 `bareDoubleDashArgumentMessage`로 분리해 `validateCommandArgs`의 inline message assembly를 줄였다. Red test 확인 후 `npm run build`, focused Vitest 50 tests, full `npm test -- --run` 660 tests, CLI surface smoke(`status --`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Bare Double Dash Recovery Refactor 2026-06-11]]


> [!success] 2026-06-11 CLI hook unexpected recovery refactor
> `agentfeed hook install claude-code <extra>` unexpected positional recovery를 `hookUnexpectedArgumentMessage`로 분리해 hook validation의 inline message assembly를 줄였다. Red test 확인 후 `npm run build`, focused Vitest 49 tests, full `npm test -- --run` 659 tests, CLI surface smoke(`hook install claude-code extra`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Hook Unexpected Recovery Refactor 2026-06-11]]


> [!success] 2026-06-11 CLI token rotate recovery refactor
> `agentfeed token rotate <extra>` unexpected positional recovery를 `tokenRotateUnexpectedArgumentMessage`로 분리해 token alias validation의 inline message assembly를 줄였다. Red test 확인 후 `npm run build`, focused Vitest 48 tests, full `npm test -- --run` 658 tests, CLI surface smoke(`token rotate browser`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Token Rotate Recovery Refactor 2026-06-11]]


> [!success] 2026-06-11 CLI completion positional recovery refactor
> `agentfeed completion <shell> <extra>` unexpected positional recovery를 `completionUnexpectedArgumentMessage`로 분리하고, completion generator fallback과 validation이 같은 supported-shell wording helper를 공유하도록 정리했다. `npm run build`, focused Vitest 47 tests, full `npm test -- --run` 657 tests, CLI surface smoke(`completion zsh extra`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가. 서버/배포/infra/CICD 작업 없음.
> - [[CLI Completion Positional Recovery Refactor 2026-06-11]]


> [!success] 2026-06-11 CLI help recovery refactor
> `agentfeed help` unexpected positional argument 복구 메시지를 `helpUnexpectedArgumentMessage` / `helpUnexpectedTokenArgumentMessage`로 분리했다. `npm run build`, focused Vitest 46 tests, full `npm test -- --run` 656 tests, CLI surface smoke(`help status extra`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가.
> - [[CLI Help Recovery Refactor 2026-06-11]]


> [!success] 2026-06-11 CLI token recovery refactor
> `agentfeed token` compatibility alias의 usage/unknown subcommand 복구 메시지를 `tokenUsageMessage` / `unknownTokenSubcommandMessage`로 분리했다. `npm run build`, focused Vitest 45 tests, full `npm test -- --run` 655 tests, CLI surface smoke(`token rotat`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가.
> - [[CLI Token Recovery Refactor 2026-06-11]]


> [!success] 2026-06-11 CLI flagless option recovery refactor
> bare positional option name(`yes`, `open-review`)을 dashed flags로 제안하는 로직을 `flaglessOptionSuggestionLines`로 분리해 `src/cli/index.ts` inline Map/formatting 책임을 줄였다. `npm run build`, focused Vitest 6 tests, CLI help 38 tests, full `npm test -- --run` 654 tests, CLI surface smoke(`share yes open-review`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가.
> - [[CLI Flagless Option Recovery Refactor 2026-06-11]]


> [!success] 2026-06-11 CLI hook action recovery refactor
> `hook` action typo 복구 메시지를 `unknownHookActionMessage`로 분리해 `src/cli/index.ts` inline recovery 조합을 줄였다. `npm run build`, focused Vitest 43 tests, full `npm test -- --run` 653 tests, CLI surface smoke(`hook instal claude-code`) 통과. LSP는 `typescript-language-server` 미설치로 실행 불가.
> - [[CLI Hook Action Recovery Refactor 2026-06-11]]

현재 active goal은 “잘 만든 MVP”가 아니라 **Enterprise급 완성도 검증과 보완**이다. 2026-06-04~06 사이의 로컬/CI/contract/UI/UX evidence는 중요한 historical baseline으로 유지하되, 지금은 CLI-Backend-Frontend contract drift, fail-closed error visibility, 문서 최신성, 그리고 각 repo 내부 품질을 계속 검증하는 단계다.

> [!warning] 서버/배포 작업 상태
> 개인 서버 IP-only smoke와 배포 evidence는 historical 기록으로 남긴다. 현재 goal에서는 서버/infra/CICD/deploy 작업을 진행하지 않는다.

- 사람이 직접 해야 할 일: [[Human Action Checklist]]
- 서버/env 기준: [[Runtime Configuration]]
- 완료된 대량 hardening 요약: [[Commercial Readiness Completed Summary 2026-06-04]]
- 현재 cross-repo contract 기준: [[Cross Repo Contract Audit 2026-06-11]]


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

- [x] [[CLI Unknown Option Candidate Recovery Refactor 2026-06-11]] — unknown option candidate assembly를 `src/cli/command-recovery.ts`로 분리하고 red/focused/full CLI suite 통과 확인.
- [x] [[CLI Conflict Recovery Decision Refactor 2026-06-11]] — conflicting option detection/recovery decision을 `src/cli/command-recovery.ts`로 분리하고 red/focused/full CLI suite 통과 확인.
- [x] [[CLI Option Value Rejection Recovery Refactor 2026-06-11]] — flag value-not-accepted recovery message formatting을 `src/cli/command-recovery.ts`로 분리하고 red/focused/full CLI suite 통과 확인.
- [x] [[CLI Option Value Recovery Refactor 2026-06-11]] — missing value-option recovery message formatting을 `src/cli/command-recovery.ts`로 분리하고 red/focused/full CLI suite 통과 확인.
- [x] [[CLI Completion Recovery Refactor 2026-06-11]] — completion shell recovery message formatting을 `src/cli/command-recovery.ts`로 분리하고 focused + full CLI suite 통과 확인.
- [x] [[CLI Unknown Recovery Refactor 2026-06-11]] — unknown command/option recovery message formatting을 `src/cli/command-recovery.ts`로 분리하고 focused + full CLI suite 통과 확인.
- [x] [[CLI Leading Option Recovery Refactor 2026-06-11]] — leading option command-first recovery message formatting을 `src/cli/leading-option-recovery.ts`로 분리하고 focused + full CLI suite 통과 확인.
- [x] [[CLI Hook Help Recovery Refactor 2026-06-11]] — help topic/hook usage/unsupported hook target recovery message formatting을 `src/cli/command-recovery.ts`로 분리하고 focused + full CLI suite 통과 확인.
- [x] [[CLI Review Handoff Refactor 2026-06-11]] — CLI review URL handoff human formatting을 `src/cli/review-handoff.ts`로 분리하고, `index.ts`의 URL trust policy/side-effect 순서는 source contract test로 유지. CLI build, focused handoff/share tests, full vitest 624 tests 통과.
- [x] [[CLI Upload Guidance Refactor 2026-06-11]] — CLI upload success next-action과 API compatibility/token preflight 실패 detail, `Fix first`/`Then retry` recovery message 계산을 `src/cli/upload-guidance.ts`로 분리. CLI build, focused share/collect/publish tests, full vitest 623 tests 통과.
- [x] [[CLI Auth Result Refactor 2026-06-11]] — CLI `login`/`rotate` 완료 메시지, JSON credential payload, saved/no-save next-action 계산을 `src/cli/auth-result.ts`로 분리하고 entrypoint는 출력/orchestration만 담당하도록 축소. CLI build, focused auth/status/doctor tests, full vitest 623 tests 통과.
- [x] [[CLI Doctor Readiness Refactor 2026-06-11]] — CLI `agentfeed doctor` readiness/summary/priority/next-action 순수 로직을 `src/cli/doctor-readiness.ts`로 분리하고 entrypoint는 출력/orchestration만 담당하도록 축소. CLI build, focused doctor/status tests, full vitest 623 tests 통과.
- [x] [[CLI Status Readiness Refactor 2026-06-11]] — CLI `agentfeed status` readiness/summary/next-action 순수 로직을 `src/cli/status-readiness.ts`로 분리하고, doctor priority action의 `next_action as string` 타입 단언을 type guard로 제거. CLI build, focused status+doctor tests, full vitest 623 tests 통과.
- [x] [[CLI Doctor Config Error Visibility 2026-06-11]] — `agentfeed doctor`가 손상된 `.agentfeed/config.json`을 `not initialized`로 숨기지 않고 readiness/project/collection/warnings/priority actions/JSON에서 `config unreadable`, `project config error`, `agentfeed init --force` 복구 경로를 명확히 보여주도록 보강. CLI build, focused status+doctor tests, full vitest 통과.
- [x] [[CLI Status Config Error Visibility 2026-06-11]] — `agentfeed status`가 손상된 `.agentfeed/config.json`을 `not initialized`로 숨기지 않고 human/JSON 출력에서 `config unreadable`, `config_error`, `agentfeed init --force`/`agentfeed doctor` 복구 명령을 명확히 보여주도록 보강. CLI build, focused status tests, full vitest 통과.
- [x] [[Frontend API Worklog Social State Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 worklog social stats와 viewer state 타입/parser를 `api-worklog-social-state.ts`로 분리하고 card/detail parser가 같은 fail-closed parser를 공유하도록 정리. Frontend lint/test/build 통과, frontend commit `3a0fdb8` 푸시 완료.
- [x] [[Frontend API Worklog Metrics Source Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 worklog metrics/source evidence 타입과 parser를 `api-worklog-metrics-source.ts`, agent taxonomy를 `api-worklog-taxonomy.ts`로 분리하고 `@/lib/api` public export surface를 유지. Frontend lint/test/build 통과, frontend commit `d326b47` 푸시 완료.
- [x] [[Frontend API Username Check Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 username availability response 타입과 parser를 `api-username-check.ts`로 분리하고 `@/lib/api` public export와 `users.checkUsername()` 호출 surface를 유지. Frontend lint/test/build 통과, frontend commit `b1c7f2d` 푸시 완료.
- [x] [[Frontend API Public User Split 2026-06-11]] — Frontend PublicUser 타입/normalizer를 `api-public-user.ts`로 통합하고 notification-local 중복 parser를 제거. Frontend lint/test/build 통과, frontend commit `54cd0c0` 푸시 완료.
- [x] [[Frontend API Notification Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 notification list 타입과 response parser를 `api-notifications.ts`로 분리하고 `@/lib/api` public type export와 `me.notifications()` 호출 surface를 유지. Frontend lint/test/build 통과, frontend commit `4b58a09` 푸시 완료.
- [x] [[Frontend API Activity Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 public profile activity 타입과 response parser를 `api-activity.ts`로 분리하고 `@/lib/api` public type export와 `users.activity()` 호출 surface를 유지. Frontend lint/test/build 통과, frontend commit `c56eccd` 푸시 완료.
- [x] [[Frontend API Dashboard Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 dashboard summary/recent worklog 타입과 response parser를 `api-dashboard.ts`로 분리하고 `@/lib/api` public type export와 `me.dashboard*` 호출 surface를 유지. Frontend lint/test/build 통과, frontend commit `daae14d` 푸시 완료.
- [x] [[Frontend API Integration Status Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 integration status 타입/response parser를 `api-integration-status.ts`로 분리하고 `@/lib/api` public type export와 `me.integrations()` 호출 surface를 유지. Frontend lint/test/build 통과, frontend commit `21eda72` 푸시 완료.
- [x] [[Frontend API Ingestion Tokens Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 ingestion token 타입/response parser를 `api-ingestion-tokens.ts`로 분리하고 `@/lib/api` public type export와 `me.*Token` 호출 surface를 유지. Frontend lint/test/build 통과, frontend commit `e4cdbd0` 푸시 완료.
- [x] [[Frontend API Worklog Actions Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 worklog action response parser를 `api-worklog-actions.ts`로 분리하고 publish/privacy action 호출 surface를 유지. Frontend lint/test/build 통과, frontend commit `1bdeded` 푸시 완료.
- [x] [[Frontend API Social Actions Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 social action response parser를 `api-social-actions.ts`로 분리하고 호출 surface를 유지. Frontend lint/test/build 통과, frontend commit `bca1a44` 푸시 완료.
- [x] [[Frontend API Contract Primitives Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 공통 contract primitive guard를 `api-contract-primitives.ts`로 분리하고 parser behavior를 유지. Frontend lint/test/build 통과, frontend commit `b89bdb1` 푸시 완료.
- [x] [[Frontend API Integration Guide Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 setup-guide parser와 integration type contract를 `api-integration-guide.ts`로 분리하고 public export surface를 유지. Frontend lint/test/build 통과, frontend commit `40e04c8` 푸시 완료.
- [x] [[Frontend API Transport Boundary Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 API transport/error boundary를 `api-transport.ts`로 분리하고 public export surface를 유지. Frontend lint/test/build 통과, frontend commit `1b222ac` 푸시 완료.
- [x] [[Frontend API Response Envelope Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 response envelope 타입/list pagination normalizer를 `api-response.ts`로 분리하고 public export surface를 유지. Frontend lint/test/build 통과, frontend commit `e89cfc9` 푸시 완료.
- [x] [[Frontend API Compatibility Split 2026-06-11]] — Frontend `src/lib/api.ts`에서 backend metadata compatibility 책임을 `api-compatibility.ts`로 분리하고 public export surface를 유지. Frontend lint/test/build 통과, frontend commit `2016fda` 푸시 완료.
- [x] [[Cross Repo Contract Audit 2026-06-11]] — CLI/Frontend 호출 경로와 Backend route surface를 대조했고, Frontend 53개 호출 경로는 모두 Backend에 존재함을 확인. Frontend lint/test, Backend 핵심 contract 62 tests, CLI typecheck/full test 610 tests 통과.
- [x] Frontend user/account response guard가 malformed auth.me/profile/username-check 성공 payload를 fail-closed 처리하도록 보강.
- [x] [[User Account Response Guard 2026-06-08]] — auth.me/users.get/users.checkUsername response guard 보강.
- [x] [[Comment Response Guard 2026-06-08]] — worklog comment list/create response guard 보강.
- [x] [[Strict Read List Envelope Guard 2026-06-08]] — 주요 read-list API의 permissive list wrapper 제거.
- [x] [[Search Explore Nested Contract Guard 2026-06-08]] — Search/Explore nested project/pagination contract 보강.
- [x] [[Permissive List Normalizer Source Guard 2026-06-08]] — API read path의 permissive list normalizer 재도입 방지.
- [x] [[Ingest Nested Contract Fail Closed Guard 2026-06-08]] — CLI ingest nested metrics/source/timeline 객체도 계약 밖 필드를 조용히 무시하지 않도록 Backend schema와 Dev OpenAPI gate를 fail-closed로 보강 완료.
- [x] [[Frontend Visible Mutation Failure Contract 2026-06-08]] — Feed follow와 AppContext like/bookmark 실패가 조용히 무시되지 않고 rollback + visible error로 유지되도록 source contract 보강 완료.
- [x] [[CLI Metadata Parse Error Clarity 2026-06-08]] — CLI API compatibility metadata가 non-JSON/invalid JSON/data envelope missing인 경우를 구체 오류로 표시하도록 보강 완료.
- [x] [[CLI Ingest Status Parse Error Clarity 2026-06-08]] — CLI `/ingest/status` token check가 non-JSON/invalid JSON/data envelope missing인 경우를 구체 오류로 표시하도록 보강 완료.
- [x] [[CLI Success Response Envelope Guard 2026-06-08]] — CLI postJson/postIngest 성공 응답이 invalid JSON/data envelope missing인 경우 API boundary에서 fail-closed 처리하도록 보강 완료.
- [x] [[Frontend Leaderboard Adapter Fail Closed 2026-06-08]] — Leaderboard adapter가 malformed ranking rows를 조용히 drop하지 않고 visible error path로 fail-closed 하도록 보강 완료.
- [x] [[Frontend Comment Adapter Fail Closed 2026-06-08]] — Worklog comments adapter가 malformed comment rows를 빈/부분 목록으로 숨기지 않고 section error로 fail-closed 하도록 보강 완료.
- [x] [[Frontend Explore Page Fallback Removal 2026-06-08]] — Explore tags/rising builders가 strict API normalizer 이후 page-local 빈/부분 목록 fallback으로 contract mismatch를 숨기지 않도록 보강 완료.
- [x] [[Frontend Search Prompt Fallback Removal 2026-06-08]] — Search prompts가 strict API normalizer 이후 page-local 빈/부분 목록 fallback으로 contract mismatch를 숨기지 않도록 보강 완료.
- [x] [[Frontend Shared Adapter Fail Closed 2026-06-08]] — Shared UI list adapters가 malformed normalized rows를 catch/drop하지 않고 fail-closed 하도록 보강 완료.
- [x] [[Frontend Worklog Detail Adapter Fail Closed 2026-06-08]] — Worklog detail outcome/timeline/social normalized payload를 legacy string/row-drop/zero fallback으로 숨기지 않고 fail-closed 하도록 보강 완료.
- [x] [[Frontend Worklog Card Adapter Fail Closed 2026-06-08]] — Worklog card/list author/metrics/social normalized payload를 fallback identity/zero stats/empty metrics로 숨기지 않고 fail-closed 하도록 보강 완료.
- [x] [[Frontend Project Adapter Stats Guard 2026-06-08]] — Project summary/detail stats adapter가 API-authorized null과 malformed object를 구분하고 detail missing stats를 합성하지 않도록 보강 완료.
- [x] [[Frontend Project Identity Visibility Guard 2026-06-08]] — Project visibility/owner/tags/owner_id/slug malformed payload가 public filtering 또는 route fallback으로 숨겨지지 않도록 보강 완료.
- [x] [[Frontend Worklog Source Viewer Guard 2026-06-08]] — Worklog source/viewer_state adapter가 API-authorized null과 malformed present object를 구분해 collection evidence/social UI contract mismatch를 숨기지 않도록 보강 완료.
- [x] [[Frontend Worklog Metrics Guard 2026-06-08]] — Worklog metrics adapter가 models_used/agent_metrics/agent_modes/collection_sources malformed payload를 빈 배열이나 부분 UI로 숨기지 않고 fail-closed 처리하도록 보강 완료.
- [x] [[Frontend Project Mutation Adapter Guard 2026-06-08]] — Project create/update response를 mutation 전용 adapter로 처리해 repo/homepage/timestamps/tags/stats 계약을 보존하고 page-level fallback masking을 제거 완료.
- [x] [[Frontend Collection Evidence Guard 2026-06-08]] — Worklog review collection evidence helper의 `filter(Boolean)`/blank-agent row drop을 제거해 malformed models/agent metrics/source evidence를 fail-closed 처리 완료.
- [x] [[Frontend Worklog Review Payload Guard 2026-06-08]] — WorklogReviewPage render guard가 status/visibility/metrics/source/preview safety/public_fields를 확인해 malformed review payload가 publish UI까지 들어오지 않도록 보강 완료.
- [x] [[Frontend Project Mutation Route Guard 2026-06-08]] — Project create success에서 owner username이 없으면 `/projects/:id` legacy route로 이동한다는 계약을 source/contract regression으로 보강 완료.
- [x] [[CLI Ingest Status Test Mock Contract 2026-06-08]] — CLI release preflight에서 stale `/ingest/status` healthy mocks가 strict token/user lifecycle contract를 만족하지 않아 collect/share upload tests가 실패하던 문제를 수정 완료.
- [x] [[Frontend Worklog Detail Array Contract Guard 2026-06-08]] — Worklog detail API boundary가 `outcome`/`timeline` missing/null을 빈 배열로 합성하지 않고 contract mismatch로 fail-closed 하도록 보강 완료.
- [x] [[Frontend Worklog Review Privacy Finding Guard 2026-06-08]] — Worklog Review page-local privacy finding helper가 malformed row를 drop하거나 fallback 값으로 합성하지 않고 fail-closed 하도록 보강 완료.
- [x] [[Frontend Worklog Review Public Fields Guard 2026-06-08]] — Worklog Review page-local `public_fields` helper가 비배열/blank row를 빈 목록으로 숨기지 않고 fail-closed 하도록 보강 완료.
- [x] [[Frontend Profile Prompt Avatar Coverage 2026-06-08]] — Profile Prompts 탭의 user-uploaded prompt 카드가 text-only로 남지 않고 profile owner GitHub avatar를 렌더링하도록 보강 완료.
- [x] [[Frontend Worklog Review Action Routing Guard 2026-06-08]] — Worklog Review resolve/publish/unpublish mutation이 typed API client action response guard를 우회하지 않도록 source contract 보강 완료.
- [x] [[Frontend UI API Boundary Guard 2026-06-08]] — Frontend production UI surface가 raw `fetch`/private `apiFetch`로 typed API boundary를 우회하지 못하도록 recursive source contract 보강 완료.
- [x] [[Backend Ok Response Contract Guard 2026-06-08]] — Backend 공통 `OkResponse`를 `{data:{ok:true}}` strict schema로 잠가 frontend mutation success normalizer와 계약을 일치시키고 mutable default를 제거 완료.
- [x] [[Backend Schema Mutable Default Guard 2026-06-08]] — Backend response schema의 literal mutable defaults를 `Field(default_factory=...)`로 교체하고 `app/schemas` 재발 방지 source contract를 추가 완료.
- [x] [[Ingest Remote Preview Contract Guard 2026-06-08]] — `/ingest/worklogs/preview` 응답을 Backend typed payload와 CLI fail-closed parser 양쪽에서 고정 완료.
- [x] [[Ingestion Status True Ok Guard 2026-06-08]] — `/ingest/status` 성공 payload의 `ok`를 Backend `Literal[True]`와 CLI `ok === true` parser로 일치시켜 false/string ok drift를 차단 완료.
- [x] [[Cli Auth Approve True Ok Guard 2026-06-08]] — CLI browser approval 성공 payload를 Backend `Literal[True]`/`Literal["approved"]` schema와 Frontend strict parser로 일치시켜 false/pending approval drift를 차단 완료.
- [x] [[Cli Auth Session Status Enum Guard 2026-06-08]] — CLI auth session metadata status를 Backend `Literal` enum과 Frontend strict parser/type으로 일치시켜 unknown status drift를 차단 완료.
- [x] [[Integration Status Enum Guard 2026-06-08]] — `/me/integrations` status를 Backend `Literal` enum과 Frontend strict parser/exported type으로 일치시켜 unknown integration status drift를 차단 완료.
- [x] [[Worklog Timeline Status Enum Guard 2026-06-08]] — worklog timeline status를 Backend `Literal` enum, Frontend strict parser, CLI draft validation과 일치시켜 unknown timeline status drift를 차단 완료.
- [x] [[Frontend Worklog Status Type Guard 2026-06-08]] — Frontend exported worklog status type을 Backend `WorklogStatus`/strict parser와 일치시켜 Dashboard/card/create consumer의 `string` fallback drift를 차단 완료.
- [x] [[Frontend Privacy Status Guard 2026-06-08]] — Frontend privacy_scan.status를 Backend/CLI `safe|warning|danger` enum과 일치시켜 unknown privacy status drift를 fail-closed 처리 완료.

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

- [x] [[Search Leaderboard Query Contract Guard 2026-06-08]] — Search/Leaderboard discovery query type과 leaderboard response type을 Backend Literal/Frontend source guard로 일치시키고 unknown query silent fallback을 제거 완료.
- [x] [[Notification Type Contract Guard 2026-06-08]] — Notification list `type`/`target.type`을 Backend enum/Literal과 Frontend closed union/parser로 일치시켜 unknown notification drift를 fail-closed 처리 완료.
- [x] [[Health Readiness Status Contract Guard 2026-06-08]] — Backend `/health`와 `/health/ready` status를 `ok` 및 `ready|not_ready` Literal schema로 고정해 readiness contract drift를 차단 완료.
- [x] [[Username Check Reason Contract Guard 2026-06-08]] — `/users/check-username` reason을 Backend `Literal["already_taken"]`과 Frontend closed union/parser로 일치시켜 unknown username-check reason drift를 차단 완료.
- [x] [[Dashboard Action URL Contract Guard 2026-06-08]] — Dashboard recent worklog `action_url`을 Backend schema와 Frontend API parser에서 `/worklogs/:id[/review]` 내부 경로로 고정해 external/unknown route drift를 fail-closed 처리 완료.
- [x] [[Privacy Finding Enum Contract Guard 2026-06-08]] — Backend privacy finding `type`/`severity` Literal과 Frontend API parser/type을 일치시켜 unknown privacy finding drift를 review/detail boundary에서 fail-closed 처리 완료.
- [x] [[Leaderboard Period Type Contract Guard 2026-06-08]] — Frontend `ApiLeaderboardResponse.period`를 Backend `LeaderboardPeriod`와 동일한 closed union으로 좁혀 parser output이 downstream에서 `string`으로 재개방되지 않도록 완료.
- [x] [[CLI Privacy Severity Contract Guard 2026-06-08]] — CLI local draft/ingest `PrivacySeverity`를 Backend/Frontend `info|low|medium|high|critical|unknown` contract와 일치시키고 unresolved `critical` finding도 publish blocker로 처리 완료.
- [x] [[CLI Ingest Upload Status Contract Guard 2026-06-08]] — CLI remote ingest success response를 Backend `IngestResponse(status=needs_review, visibility=private)` contract로 좁히고 `already_uploaded`는 로컬 캐시/duplicate reconciliation 전용 상태로 분리 완료.

## Historical — 개인 서버 IP-only smoke evidence

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
- [x] [[Personal Server Deploy Smoke 2026-06-08]] — CLI success envelope guard 반영 후 개인서버 stack 재기동 및 hosted compatibility smoke 통과.
- [x] [[Personal Server Deploy Shared Adapter 2026-06-08]] — Shared adapter fail-closed frontend 변경을 개인 서버 IP-only stack에 재배포하고 API/frontend/CLI doctor smoke 통과.
- [x] [[Personal Server Deploy Worklog Source Viewer 2026-06-08]] — Worklog source/viewer_state frontend guard를 개인 서버 IP-only stack에 배포하고 API/frontend/CLI doctor smoke 통과.
- [x] [[Personal Server Deploy Discovery Query Guard 2026-06-08]] — Search/Leaderboard query contract guard를 개인 서버 IP-only stack에 배포하고 hosted compatibility + invalid query 422 smoke 통과.
- [x] [[Personal Server Deploy Dashboard Action URL Guard 2026-06-08]] — Dashboard action URL contract guard를 개인 서버 IP-only stack에 배포하고 backend/frontend 강제 재생성 후 hosted compatibility smoke 통과 확인.
- [x] [[Hosted Smoke Insecure Server Test Flag 2026-06-08]] — IP-only 개인서버 smoke에서 Frontend diagnostic child process에 insecure server-test flag가 전달되지 않아 compatibility probe가 실패하던 문제를 수정하고 hosted smoke 통과 확인.
- [x] CLI login compatibility가 IP-only server-test review/authorize origin을 명시 flag 아래에서 통과하도록 수정.
- [x] CLI → API → Frontend review → public feed E2E를 임시 user/session으로 검증.
- [x] 서버 검증 데이터 reset 완료: users/tokens/worklogs/projects/cli_sessions `0`.

## Paused — 서버/릴리스 관련 사람이 결정하면 이어서 할 일

- [ ] 개인 서버 정보 기준으로 `agentfeed-dev` 서버 runbook 작성.
- [x] 서버용 `.env.server`를 실제 IP/port 기준으로 생성하되 git에는 제외.
- [x] server smoke 결과를 Obsidian evidence로 반영: [[Server IP-only Smoke Evidence 2026-06-05]].
- [x] GitHub OAuth App Client ID/Secret을 `.env.server`에 반영할 helper 준비.
- [x] OAuth 이후 CLI approval/product flow smoke 실행. 단, 실제 GitHub credential 입력 자동화는 Playwright cookie 한계 때문에 임시 browser session으로 대체.
- [ ] 실제 사용자 브라우저에서 GitHub credential 입력까지 포함한 live login을 한 번 수행.
- [ ] production domain이 생기면 hosted readiness와 `make commercial-readiness` 재실행.
- [ ] npm package 이름/license/homepage/trusted publishing 정책이 확정되면 release/publish 절차 준비.
- [ ] npm trusted publishing을 실제 public repo/environment와 연결한 뒤, tag 기반 dry release 절차 점검.

## Deferred — 서버/릴리스/정책 결정 대기

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
- [x] [[CLI Auth Ingest Avatar Contract 2026-06-08]] — CLI auth exchange, ingestion status, managed token rotate, saved credentials, OpenAPI gate, and OAuth smoke now preserve GitHub `avatar_url`; 2026-06-08 후속으로 exchange `token_id`/`token_expires_at`/`user.id`/`user.display_name` 필수 계약도 fail-closed 처리 완료.
- [x] [[User Avatar Owner Review Coverage 2026-06-08]] — Dashboard recent worklogs, Worklog Review public preview, and project owner adapters now preserve GitHub avatars even when public username is missing.
- [x] [[Frontend Profile Link Identity Guard 2026-06-08]] — Header, Feed, Search, Explore, Leaderboard, and Worklog Detail now avoid backend-id profile links for username-missing users.

## Completed
- [x] [[Frontend API JSON Boundary Assertion Move 2026-06-20]] — API JSON parsing source-boundary assertions를 `api-json-boundary-assertions.ts`로 이동하고 focused runner를 2 pure LOC로 축소.
- [x] [[Frontend Collection Evidence Malformed Assertion Move 2026-06-20]] — malformed collection evidence fail-closed assertion loop를 `collection-evidence-assertions.ts`로 이동하고 focused runner를 2 pure LOC로 축소.
- [x] [[Personal Server Deploy One-off Refresh 2026-06-19#2026-06-19 22:26 UTC — Post owner project detail assertion move refresh]] — owner-project-detail assertion move 후 사용자 요청 1회 현재 서버 배포와 readiness smoke 완료.
- [x] [[Frontend Owner Project Detail Assertion Move 2026-06-19]] — owner project detail contract runner orchestration을 `owner-project-detail-assertions.ts`로 이동하고 focused runner를 5 pure LOC로 축소.
- [x] [[CLI Command Recovery Refactor 2026-06-11]] — command help/usage/conflict recovery message formatting을 `src/cli/command-recovery.ts`로 분리하고 focused + full CLI suite 통과 확인.
- [x] [[CLI Closest Match Refactor 2026-06-11]] — command/help/option suggestion typo matching을 `src/cli/closest-match.ts`로 분리하고 focused + full CLI suite 통과 확인.
- [x] [[CLI Error Output Refactor 2026-06-11]] — JSON error shaping을 `src/cli/error-output.ts`로 분리하고 focused + full CLI suite 통과 확인.
- [x] [[CLI General Guidance Actions Refactor 2026-06-11]] — privacy scan/hook/init/command catalog follow-up guidance를 `src/cli/guidance-actions.ts`로 분리하고 focused + full CLI suite 통과 확인.
- [x] [[CLI Draft Navigation Actions Refactor 2026-06-11]] — share dry-run/drafts/discard/open follow-up command guidance를 `src/cli/draft-navigation-actions.ts`로 분리하고 focused + full CLI suite 통과 확인.
- [x] [[CLI Draft Next Actions Refactor 2026-06-11]] — preview/collect/remote preview next-action 계산을 `src/cli/draft-next-actions.ts`로 분리하고 focused + full CLI suite 통과 확인.
- [x] [[Integration Type Contract Guard 2026-06-08]] — Backend/Frontend integration type을 `github|claude_code|codex|cursor|gemini_cli|tokscale` contract로 축소하고 setup-guide type mismatch를 fail-closed 처리 완료.
- [x] [[Worklog Filter Action Type Guard 2026-06-08]] — Backend `/me/worklogs` filter와 Frontend worklog/CLI-auth helper가 status·visibility를 broad string으로 재개방하지 않도록 축소 완료.
- [x] [[Visibility Type Surface Guard 2026-06-08]] — Backend explore schema와 Frontend API/UI 타입 표면의 visibility를 `private|unlisted|public` contract로 축소 완료.
- [x] [[CLI Visibility Contract Guard 2026-06-08]] — CLI에 남아 있던 서버 미지원 `team` visibility를 제거하고 upload success result 타입을 private-review contract로 축소 완료.
- [[Frontend Request Strict Contract 2026-06-08]] — Frontend/CLI mutating request schemas가 계약 밖 필드를 조용히 무시하지 않도록 Backend extra-forbid와 Dev additionalProperties gate 추가 완료. 2026-06-08 후속으로 comment/report/privacy resolution/publish/unpublish 및 ingestion token create/rotate/revoke exact request body guard까지 보강 완료.
- [[Backend Ingest Strict Contract 2026-06-08]] — Backend ingest request가 계약 밖 privacy/sample/raw fields를 조용히 무시하지 않도록 fail-closed schema와 Dev forbidden-field gate 추가 완료.
- [[CLI Privacy Sample Upload Strip 2026-06-08]] — CLI local privacy sample은 유지하되 Backend contract 밖 `sample_redacted`는 upload payload에서 제거 완료.
- [[CLI Ingest Request Contract Guard 2026-06-08]] — CLI 멀티에이전트 ingest request body의 metrics/source/privacy field contract와 upload response `created_at`/`status`/`visibility` contract를 Dev OpenAPI gate에 추가 완료.
- [[CLI Ingest Status Contract Guard 2026-06-08]] — CLI `/v1/ingest/status` parser와 Dev OpenAPI gate가 token lifecycle/user identity 응답을 fail-closed로 검증하도록 보강 완료.
- [[Human Checklist Release Metadata Refresh 2026-06-08]] — owner action checklist의 stale CLI homepage 결정 문구를 현재 GitHub README canonical homepage 상태로 정리 완료.
- [[Dev Smoke Homepage Fixture Guard 2026-06-08]] — cross-repo smoke fixture와 product brief도 GitHub README homepage 기준으로 동기화하고 `agentfeed.dev` homepage fixture 재도입 guard 추가 완료.
- [[CLI Release Metadata Homepage Guard 2026-06-08]] — 준비되지 않은 `agentfeed.dev` 대신 GitHub README를 CLI npm homepage로 사용하고 release preflight guard를 동기화 완료.
- [[Frontend Setup Guide Payload Guard 2026-06-08]] — malformed integration setup-guide payload가 Settings render crash로 이어지지 않도록 Frontend API boundary runtime guard 추가 완료.
- [[Frontend Integration Compatibility Probe 2026-06-08]] — Settings가 소비하는 `/me/integrations`와 `/integrations/{type}/setup-guide`를 Frontend mock/hosted compatibility 및 Dev OpenAPI gate에 포함 완료.
- [[Frontend Integration Setup Guide Surface 2026-06-08]] — Settings integrations card가 Backend setup-guide API를 실제로 소비하고 CLI command snippets를 표시하도록 연결 완료.
- [[Frontend Token Response Guard 2026-06-08]] — Settings ingestion token list/create/rotate response를 runtime guard로 fail-closed 처리하고 Dev OpenAPI token lifecycle gate를 확장 완료.
- [[Frontend Social Response Guard 2026-06-08]] — like/bookmark/follow mutation responses are runtime-guarded and Dev OpenAPI gate now covers social count fields.
- [[Worklog Review Response Guard 2026-06-08]] — publish review payload를 Frontend API boundary에서 fail-closed 검증하도록 보강 완료.
- [[Worklog Detail Response Guard 2026-06-08]] — public worklog detail payload와 multi-agent evidence를 Frontend API boundary에서 fail-closed 검증하도록 보강 완료.
- [[Worklog Card List Response Guard 2026-06-08]] — feed/profile/project/explore/me worklog card list rows를 Frontend API boundary에서 fail-closed 검증하도록 보강 완료.
- [[Search Explore Nested Response Guard 2026-06-08]] — search/explore nested worklog/project/user/prompt/category arrays를 Frontend API boundary에서 fail-closed 검증하도록 보강 완료.
- [[Remaining Read Response Guard 2026-06-08]] — dashboard/activity/moderation/notifications/suggestions/tags read payload를 Frontend API boundary에서 fail-closed 검증하도록 보강 완료.
- [[Project Leaderboard Integration Guard 2026-06-08]] — projects/users.projects/leaderboard/me.integrations/ok action 응답을 Frontend API boundary에서 fail-closed 검증하도록 보강 완료.
- [[Worklog Action Response Guard 2026-06-08]] — review publish/unpublish/privacy resolution action responses now fail closed at the Frontend boundary, and Backend/OpenAPI schemas expose the narrower actual return enums.
- [[Backend Integration Guide CLI Contract 2026-06-08]] — setup guide API에서 stale `configure`/`connect` CLI command 제거 및 contract test 추가 완료.
- [[Backend Public Username Discovery Guard 2026-06-08]] — search/explore/leaderboard profile entry API에서 username 없는 user 노출 방지 완료.
- [[GitHub Avatar Fallback Refresh 2026-06-08]] — 기존 GitHub 계정 avatar refresh 및 frontend github_url-only avatar fallback 완료.
- [[Hosted Smoke Server Test Env Forwarding 2026-06-08]] — IP-only 개인서버 smoke에서 Frontend compatibility runner가 server-test HTTP 허용 env를 유지하도록 보완하고 hosted compatibility smoke 통과를 확인함.
- [[Account Project Mutation Response Guard 2026-06-08]] — project/profile/username/settings mutation 응답을 Frontend boundary에서 fail-closed 검증하도록 보강 완료.
- [[Remaining Mutation Response Guard 2026-06-08]] — worklog create/update/comment, moderation status update, notification read mutation 응답을 Frontend boundary에서 fail-closed 검증하도록 보강 완료.
- [[CLI Auth Approval Response Guard 2026-06-08]] — Frontend CLI browser approval session/approve 응답을 runtime guard로 fail-closed 처리 완료.
