---
title: Commercial Readiness Hardening - Remote CI Environment Recovery 2026-06-01
aliases:
  - Remote CI Environment Recovery
  - GitHub Actions CI Green Recovery
  - CLI Backend CI Recovery
  - CI Env Parity Gate
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/ci
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Remote CI Environment Recovery 2026-06-01

## 목적

GitHub Actions 기준 최신 CLI/Backend CI가 red였기 때문에, 로컬 green만으로 상용화 readiness를 주장하지 않도록 원격 CI 환경 차이를 재현하고 복구했습니다.

> [!important]
> 상용화 gate는 로컬 `test-all.sh`만이 아니라 GitHub-hosted runner의 기본 env(`GITHUB_ACTIONS=true`, top-level workflow env)에서도 통과해야 합니다.

## 원격 실패 증거

- CLI `downingmoon/agentfeed-cli` CI run `26738377108` failed.
  - 실패 지점: `npm test -- --run`.
  - 원인: GitHub Actions의 `GITHUB_ACTIONS=true`가 browser login CI guard를 켰고, mock browser-auth 테스트들이 명시 override 없이 `browserLogin()`을 호출했습니다.
- Backend `downingmoon/agentfeed-backend` CI run `26738377182` failed.
  - 실패 지점: `uv run --locked --group dev pytest tests`.
  - 원인: workflow top-level `ALLOWED_ORIGINS=http://localhost:3000`가 `Settings(_env_file=None)` default contract test를 오염시켰습니다.

## 수정 요약

### CLI

- `tests/api-hook.test.ts`에서 browser-auth mock success/malformed-response 테스트는 `allowCiBrowser: true`를 명시합니다.
- `tests/cli-status-doctor.test.ts`의 subprocess rotation happy path는 CI detector env를 `0`으로 고정해 실제 GitHub runner에서도 non-CI browser flow를 검증합니다.
- 별도 CI fail-fast 테스트는 그대로 유지해, override 없는 CI browser login은 token/stdin remediation으로 실패해야 합니다.

### Backend

- `.github/workflows/ci.yml`의 dev env를 Backend default local contract와 정렬했습니다.
  - `FRONTEND_URL=http://localhost:3001`
  - `ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000`
- `test_github_ci_environment_instantiates_backend_settings` 기대값을 workflow env와 맞췄습니다.

## 계약

- CLI browser-auth happy path 테스트는 CI runner에서도 명시적인 test-only override로만 browser session mock을 실행합니다.
- CLI production behavior는 그대로 유지됩니다. 실제 CLI에서 CI browser login을 강제로 수행하려면 `--browser`가 필요합니다.
- Backend workflow env는 `Settings` allowlist와 default local dev origins를 동시에 만족해야 합니다.
- GitHub Actions 환경변수 때문에 로컬과 원격 테스트 의미가 달라지면, 해당 env를 테스트에서 명시적으로 고정합니다.

> [!warning]
> CI guard를 완화하지 않았습니다. 수정 범위는 테스트가 의도적으로 mock browser auth를 실행하는 경우에만 명시 override를 주는 것입니다.

## 검증 증거

- CLI GitHub Actions env reproduction:
  - `GITHUB_ACTIONS=true CI=true npm test -- --run tests/api-hook.test.ts tests/cli-status-doctor.test.ts` → `70 passed`
- CLI full CI-equivalent local gate:
  - `GITHUB_ACTIONS=true CI=true npm test -- --run` → `272 passed`
  - `npm run typecheck` → pass
  - `npm run release:preflight` → pass
- Backend GitHub Actions env reproduction:
  - `ENVIRONMENT=development ... ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000 ... uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py::test_github_ci_environment_instantiates_backend_settings tests/test_contracts.py::test_development_settings_allow_only_local_runtime_urls tests/test_contracts.py::test_non_development_settings_fail_closed_for_unknown_env_defaults` → `3 passed`
- Backend full CI-equivalent local gate:
  - `uv run --python 3.12 --locked --group dev ruff check .` → pass
  - `uv run --python 3.12 --locked --group dev pytest tests` with workflow env → `247 passed, 1 warning`
- Cross-repo gate:
  - `agentfeed-dev ./scripts/test-all.sh` → CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend ruff/pytest, Alembic offline migration chain 모두 pass

## 남은 리스크

> [!note]
> 원격 GitHub Actions는 이 commit push 후 다시 확인해야 합니다. 이번 note는 실패 원인과 로컬 CI-env 재현 검증을 기록합니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Remote CI environment recovery]]
- [[Runtime Configuration#2026-06-01 Production config private-host and CI-env gates]]
- [[Commercial Readiness Hardening - Production Config Private Host and CI Env Gates 2026-06-01]]
- [[Active Tasks#P1 후보]]
