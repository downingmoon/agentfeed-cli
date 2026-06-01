---
title: Commercial Readiness Hardening - Live Share Handoff Smoke Gate 2026-06-01
aliases:
  - Live Share Handoff Smoke Gate
  - CLI Share Open Review Smoke
  - Review URL Handoff E2E Gate
tags:
  - agentfeed/cli
  - agentfeed/dev
  - agentfeed/integration
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Live Share Handoff Smoke Gate 2026-06-01

## 목적

`agentfeed-dev` live smoke는 CLI browser-login token exchange부터 private review upload, privacy gate, publish, public feed까지 검증했지만, 사용자가 실제로 기대하는 `agentfeed share --open-review` / clipboard handoff는 deterministic gate로 증명하지 않았습니다.

> [!important]
> 상용화 UX에서 review URL handoff는 핵심 온보딩 경로입니다. 브라우저/클립보드 helper가 OS별로 달라도 CLI가 review URL을 정확히 전달했는지 smoke에서 잡아야 합니다.

## 변경 사항

- `agentfeed-dev/scripts/smoke-e2e.sh`
  - 임시 `open`, `xdg-open`, `wslview` helper를 PATH 앞에 둬 browser handoff URL을 기록합니다.
  - 임시 `pbcopy`, `xclip`, `wl-copy`, `xsel`, `clip.exe` helper를 PATH 앞에 둬 clipboard handoff payload를 기록합니다.
  - 기존 CLI upload 경로를 `agentfeed share --json --clipboard --open-review`로 실행합니다.
  - JSON `handoff.clipboard/browser`가 `{ requested: true, ok: true }`인지 확인합니다.
  - browser/clipboard log가 upload `review_url`과 정확히 같은지 확인합니다.
- `agentfeed-dev/README.md`
  - smoke 설명에 deterministic review URL browser/clipboard handoff 검증을 추가합니다.

## 계약

- `agentfeed share --json --clipboard --open-review`는 JSON stdout을 유지하면서, 명시적으로 요청한 browser/clipboard side effect의 성공 여부를 `handoff` 필드로 보고해야 합니다.
- Live smoke는 실제 브라우저를 열지 않고도 OS helper command 호출과 payload를 검증해야 합니다.
- Handoff helper 실패는 CLI command crash가 아니라 warning/status로 표면화되어야 합니다. 관련 회귀는 [[Commercial Readiness Hardening - Remote CI Environment Recovery 2026-06-01]]에서 고정했습니다.

## 검증 계획

- `agentfeed-dev bash -n scripts/smoke-e2e.sh`
- `agentfeed-dev ./scripts/test-all.sh`
- 가능하면 Docker stack 실행 상태에서 `make smoke-e2e`로 live 검증

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Integration - CLI Backend Frontend#남은 검증 리스크]]
- [[Commercial Readiness Hardening - Remote CI Environment Recovery 2026-06-01]]


## 검증 증거

> [!success]
> 2026-06-01 전체 cross-repo gate에서 deterministic browser/clipboard helper 기반 `agentfeed share --json --clipboard --open-review` handoff 검증을 통과했습니다.

- `agentfeed-dev ./scripts/test-all.sh` → passed
  - CLI: 20 test files, 277 tests passed; typecheck, release preflight, `npm audit` 0 vulnerabilities
  - Frontend: typecheck, contract tests, production build, `npm audit` 0 vulnerabilities
  - Backend: `ruff check`, 250 pytest tests passed, Alembic offline migration chain 449 lines captured
- `agentfeed-dev/scripts/test-all.sh` static gate가 `--clipboard --open-review`, `AGENTFEED_SMOKE_BROWSER_LOG`, `AGENTFEED_SMOKE_CLIPBOARD_LOG`, `handoff.clipboard`, README browser/clipboard 문구를 확인합니다.

## 현재 상태

- [x] Dev live smoke 자동화 게이트 완료
- [ ] 실제 사용자 작업 repo에서의 수동 `agentfeed share --open-review` smoke는 [[Integration - CLI Backend Frontend#남은 검증 리스크]]에 별도 리스크로 유지


## 원격 상태

- `downingmoon/agentfeed-dev`는 현재 GitHub Actions run이 없어 local `agentfeed-dev ./scripts/test-all.sh`를 authoritative smoke/integration gate로 기록합니다.
- 관련 CLI/Backend/Frontend code path는 [[Commercial Readiness Hardening - Sidecar P1 Trust Boundaries 2026-06-01#Remote CI]]에서 원격 CI green을 확인했습니다.
