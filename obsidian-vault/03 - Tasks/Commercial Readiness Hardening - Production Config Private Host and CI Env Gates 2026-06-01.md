---
title: Commercial Readiness Hardening - Production Config Private Host and CI Env Gates 2026-06-01
aliases:
  - Production Config Private Host Gate
  - Frontend API Private Host Gate
  - Backend CI Environment Alignment
  - Production Config Gates
tags:
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/dev
  - agentfeed/config
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Production Config Private Host and CI Env Gates 2026-06-01

## 목적

Production 배포 설정이 실수로 localhost가 아닌 **private/internal API endpoint**를 향하거나, Backend CI가 Backend runtime allowlist와 다른 환경명을 쓰는 경우를 fail-closed로 잡도록 보강했습니다.

> [!important]
> Production frontend의 `NEXT_PUBLIC_API_URL`은 public HTTPS Backend API root여야 합니다. Local smoke만 `AGENTFEED_ALLOW_LOCAL_API_BUILD=1`로 loopback API를 예외 허용합니다.

## 발견한 문제

- Frontend production preflight는 `localhost`, `127.0.0.1`, `::1`만 차단하고 있어 `https://10.0.0.1`, `https://192.168.1.10`, `https://api.internal` 같은 private/internal endpoint를 production bundle에 넣을 수 있었습니다.
- Backend config는 `ENVIRONMENT="test"`를 명시적으로 거부하지만, Backend GitHub Actions CI workflow는 `ENVIRONMENT: test`를 사용하고 있었습니다.

## 수정 요약

### Frontend

- `src/lib/host-safety.ts`를 추가해 private IPv4, non-global IPv6, reserved internal suffix(`.local`, `.internal`, `.lan`, `.home`, `.corp`) 판정을 공유합니다.
- `src/lib/api-url.ts` production validation이 private/internal host를 차단합니다.
- `scripts/check-env.mjs` build preflight도 동일 정책으로 `NEXT_PUBLIC_API_URL`을 검사합니다.
- `src/lib/external-url.ts`는 같은 host safety helper를 재사용해 외부 URL sanitizer와 API URL gate가 같은 기준을 따릅니다.

### Backend

- `.github/workflows/ci.yml`의 `ENVIRONMENT`를 Backend allowlist와 호환되는 `development`로 정렬했습니다.
- `tests/test_contracts.py`가 CI workflow env block을 읽어 `Settings(_env_file=None, **env)`가 실제로 초기화되는지 검증합니다.

### Dev 통합 gate

- `agentfeed-dev/scripts/test-all.sh`에 Frontend private API URL negative preflight와 Backend CI env static gate를 추가했습니다.

## 계약

- Production Frontend API root는 public HTTPS URL이어야 합니다.
- `AGENTFEED_ALLOW_LOCAL_API_BUILD=1`은 loopback smoke 예외이며, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `100.64.0.0/10`, ULA/link-local IPv6, `.internal`, `.local` 등은 production API root로 허용하지 않습니다.
- Backend CI runtime env는 Backend `Settings` allowlist와 실제 local CI URL 조합으로 초기화 가능해야 합니다.
- Cross-repo `test-all.sh`는 이 두 계약이 제거되면 실패해야 합니다.

> [!warning]
> Private network staging이 필요하면 production Frontend build가 아니라 별도 deployment profile/명시 env 정책을 먼저 설계해야 합니다. 현재 계약은 public SaaS 배포 안전성을 우선합니다.

## 검증 증거

- Frontend contracts:
  - `npm run test:contracts` → pass
- Frontend typecheck:
  - `npm run lint` → pass
- Frontend env preflight:
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev node scripts/check-env.mjs` → pass
  - `NEXT_PUBLIC_API_URL=https://10.0.0.1 node scripts/check-env.mjs` → `private or internal` 오류로 fail
- Backend targeted gate:
  - `uv run --python 3.12 --locked --group dev ruff check .` → pass
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py::test_github_ci_environment_instantiates_backend_settings tests/test_contracts.py::test_non_development_settings_fail_closed_for_unknown_env_defaults` → `2 passed`
- Dev static gate:
  - `bash -n scripts/test-all.sh && ./scripts/test-wait-ready.sh && git diff --check` → pass
- Cross-repo full gate:
  - `agentfeed-dev ./scripts/test-all.sh` → CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend ruff/pytest, Alembic offline migration chain 모두 pass

## 남은 리스크

> [!note]
> 이번 slice는 production config fail-closed 계약 보강입니다. 실제 Vercel/GitHub Actions hosted run은 push 후 원격 CI에서 최종 확인해야 합니다.

## 관련 링크

- [[Runtime Configuration#2026-06-01 Production config private-host and CI-env gates]]
- [[Integration - CLI Backend Frontend#2026-06-01 Production config private-host and CI-env gates]]
- [[Commercial Readiness Hardening - Backend Environment Fail Fast 2026-06-01]]
- [[Active Tasks#P1 후보]]
