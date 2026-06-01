---
title: Commercial Readiness Hardening - Live Share Hydrated Smoke Revalidation 2026-06-02
aliases:
  - Live Share Hydrated Smoke Revalidation
  - CLI Authorize Hydrated Fallback Smoke
  - User Repo Share Open Review Smoke Evidence
tags:
  - agentfeed/dev
  - agentfeed/cli
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-02
updated: 2026-06-02
---

# Commercial Readiness Hardening - Live Share Hydrated Smoke Revalidation 2026-06-02

## 목적

[[Commercial Readiness Hardening - Live Share Handoff Smoke Gate 2026-06-01]]의 `agentfeed share --open-review` handoff gate를 실제 dev stack에서 다시 실행해, 사용자 작업 repo와 같은 임시 git fixture에서 review URL browser/clipboard 전달까지 end-to-end로 증명했습니다.

> [!important]
> Frontend `/cli/authorize`는 URL-visible `session_id` 축소 이후 client hydration/sessionStorage recovery가 계약입니다. 따라서 missing-session UX smoke도 server HTML `curl` grep이 아니라 hydrated DOM 기준으로 검증해야 합니다.

## 변경 사항

- `agentfeed-dev/scripts/smoke-e2e.sh`
  - `/cli/authorize` missing-session fallback 검증을 `curl` 정적 HTML grep에서 `browser-dom-dump.mjs` hydrated DOM 검증으로 전환했습니다.
  - `CLI_AUTH_MISSING_DOM_FILE` artifact를 남기고 `AgentFeed CLI Login`, `CLI 인증 세션이 없습니다` 텍스트를 hydrated DOM에서 확인합니다.
- `agentfeed-dev/scripts/test-all.sh`
  - smoke가 hydrated missing-session DOM gate를 유지하는지 static contract를 추가했습니다.

## 검증 증거

> [!success]
> 2026-06-02 local Docker dev stack에서 `agentfeed-dev ./scripts/smoke-e2e.sh`가 통과했습니다.

- Backend readiness: `revision=head=017_user_settings_visibility_constraints`, DB connected/up-to-date 확인 후 실행
- `agentfeed-dev ./scripts/smoke-e2e.sh` → passed
  - CLI browser-login session exchange
  - CLI authorize metadata UI/browser approval
  - browser-approved token replacement/old-token invalidation
  - 임시 Cursor-style git repo에서 `agentfeed share --json --source cursor --session-file .agentfeed/cursor-smoke.jsonl --note "Smoke author note" --all --clipboard --open-review`
  - JSON `handoff.clipboard/browser == { requested: true, ok: true }`
  - deterministic browser/clipboard helper log가 upload `review_url`과 동일
  - review API → frontend review route → privacy block/resolve → publish → public detail/feed → hydrated frontend DOM
  - authenticated review/dashboard/settings/notifications DOM 및 browser sign-out revocation smoke
- Affected static checks:
  - `bash -n scripts/smoke-e2e.sh`
  - `./scripts/test-wait-ready.sh`
  - hydrated fallback static contract grep

## 결정

> [!success]
> `agentfeed share --open-review` 사용자 작업 repo smoke 리스크는 dev live smoke의 임시 git fixture와 deterministic handoff helper로 자동화 검증 완료 상태로 전환합니다.

남은 수동 리스크는 실제 GitHub OAuth app credential이 필요한 browser-login happy path뿐입니다. 해당 항목은 [[Integration - CLI Backend Frontend#남은 검증 리스크]]에 credential-gated 리스크로 유지합니다.

## 관련 링크

- [[Commercial Readiness Hardening - Live Share Handoff Smoke Gate 2026-06-01]]
- [[Integration - CLI Backend Frontend#남은 검증 리스크]]
- [[Active Tasks#P1 후보]]
