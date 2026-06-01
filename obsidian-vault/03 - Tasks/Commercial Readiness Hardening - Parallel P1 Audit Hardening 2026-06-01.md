---
title: Commercial Readiness Hardening - Parallel P1 Audit Hardening 2026-06-01
aliases:
  - Parallel P1 Audit Hardening
  - Privacy Rate Limit Metric Attribution Hardening
  - Helper Environment Scrub Hardening
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/security
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Parallel P1 Audit Hardening 2026-06-01

## 목적

CLI, Backend, Frontend를 병렬 감사해서 상용화 전 P1급 trust-boundary / privacy / public-redaction 문제를 닫습니다. 기준은 [[Integration - CLI Backend Frontend]]의 end-to-end 계약이며, 변경은 DB column/API contract/frontend display 순서를 깨지 않도록 최소화합니다.

> [!danger]
> 공개 피드에 노출되는 데이터는 Backend가 마지막 방어선이어야 합니다. CLI/Frontend가 정상 동작한다는 가정만으로 public publish나 metric redaction을 허용하면 안 됩니다.

## 병렬 감사 결과

### Backend

- Public/unlisted publish는 unresolved `PrivacyFinding` row만 차단했습니다.
  - Ingest payload의 `privacy_scan`이 누락되거나, manual worklog create에서 scan이 없으면 public 전환 시 server-side fallback scan이 없었습니다.
- Authenticated rate-limit bucket이 JWT fingerprint 기반이라 같은 user가 재로그인/재발급으로 bucket을 분산시킬 수 있었습니다.

### Frontend

- Public profile/project metric adapter가 `*_public: null`보다 raw aggregate field를 먼저 읽는 경로가 있어 redaction 의도가 깨질 수 있었습니다.
- CLI auth approval 화면의 session metadata verification은 아직 별도 endpoint/UI 확장이 필요합니다.
- Frontend 단독 CI는 mock contract 중심이라 schema-backed live contract는 `agentfeed-dev` gate가 담당합니다.

### CLI

- Browser/clipboard helper와 Claude Code hook이 helper process에 inherited secret env를 넘길 수 있었습니다.
- Global/home-level agent/plugin signal만으로 git-only draft를 특정 agent 작업처럼 귀속할 수 있었습니다.

## 변경 사항

### Backend

- `publish_worklog`에 server-side fallback privacy scan을 추가했습니다.
  - 기존 unresolved finding이 있으면 기존처럼 차단합니다.
  - `privacy_scan_json`이 없으면 title/summary/public_prompt/changed_areas/outcome/tags를 server fallback scanner가 검사합니다.
  - high/critical finding이 발견되면 `PrivacyFinding` row와 scan JSON을 저장하고 publish를 차단합니다.
- Protected route rate-limit identity를 token fingerprint에서 signed JWT `sub` 기반 user hash로 전환했습니다.
  - token 값이나 UUID 원문은 bucket key에 노출하지 않습니다.
  - invalid Bearer/cookie는 IP bucket으로 fallback합니다.
  - IP-only protected paths는 user token을 무시합니다.

### Frontend

- `normalizeProjectStats` / `normalizeUserStats`가 명시적 public metric field를 raw aggregate field보다 먼저 읽도록 변경했습니다.
- `*_public: null`이 존재하면 raw value가 함께 있어도 UI adapter 결과가 null이 되도록 contract test를 강화했습니다.

### CLI

- `src/utils/subprocess-env.ts`를 추가해 sensitive env scrub logic을 공용화했습니다.
- Browser opener, clipboard helper, Claude Code hook command에서 token/secret/session/auth 계열 env를 제거합니다.
- CLI configured command scrub은 기존 allowlist opt-in 계약을 유지합니다.
- Auto collection source fallback은 project-local agent/plugin evidence가 있을 때만 agent로 귀속합니다.
  - global/home-level signal은 session probing에는 사용할 수 있지만 git-only fallback attribution에는 사용하지 않습니다.

## 검증 증거

- CLI targeted: `npm test -- --run tests/git-draft.test.ts tests/agent-discovery.test.ts tests/clipboard.test.ts tests/open-browser.test.ts tests/api-hook.test.ts` → 5 files / 92 tests passed.
- CLI typecheck: `npm run typecheck` → passed.
- Backend targeted lint/test: selected `ruff check` + selected `pytest tests/test_contracts.py` → 24 passed.
- Frontend contract/lint: `npm run test:contracts && npm run lint` → passed.

> [!success]
> 최종 cross-repo gate인 `agentfeed-dev ./scripts/test-all.sh`까지 통과했습니다. CLI/Backend/Frontend/Dev 변경을 함께 검증했습니다.

## 최종 통합 검증

- `agentfeed-dev ./scripts/test-all.sh` → passed.
  - CLI: 20 files / 280 tests, `tsc --noEmit`, `release:preflight`, `npm audit` 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, `npm audit` 0 vulnerabilities.
  - Backend: `ruff check`, 254 pytest passed, Alembic offline migration chain captured 449 SQL lines.
- Targeted preflight도 별도 통과했습니다.
  - CLI helper/env/source attribution targeted suite: 92 tests passed.
  - Backend privacy/rate-limit targeted suite: 24 tests passed.
  - Frontend contract/lint: passed.

## 남은 후속 후보

- CLI auth browser approval 화면에서 session metadata를 Backend `GET /auth/cli/sessions/{id}`로 검증/표시하는 UX hardening.
- Frontend CI 단독 schema-backed contract gate 추가. 현재 live/schema cross-repo 검증은 `agentfeed-dev` gate에서 담당합니다.

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Environment File Ignore Safety 2026-06-01]]
- [[Commercial Readiness Hardening - Sidecar P1 Trust Boundaries 2026-06-01]]
