---
title: Commercial Readiness Hardening - Environment File Ignore Safety 2026-06-01
aliases:
  - Environment File Ignore Safety
  - Env File Secret Leak Gate
  - Cross Repo Gitignore Secret Safety
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/dev
  - agentfeed/security
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Environment File Ignore Safety 2026-06-01

## 목적

상용화 전에는 개발자가 `.env.production`, `.env.development`, `.env.local` 같은 실제 secret 파일을 실수로 git에 올릴 수 있는 경로를 닫아야 합니다. CLI는 이미 `.env.*`를 ignore했지만, Backend/Frontend/Dev repo는 일부 variant만 ignore하고 있었습니다.

> [!danger]
> GitHub OAuth secret, DB URL, JWT secret, npm/GitHub token 같은 값은 대부분 `.env.*` 파일에 저장됩니다. 예시 파일은 추적하되 실제 환경 파일은 repo 전체에서 fail-closed로 ignore되어야 합니다.

## 발견

- `agentfeed-backend/.gitignore`는 `.env`와 `.env.local`, `.env.*.local`만 ignore해서 `.env.production`, `.env.development`가 추적 후보가 될 수 있었습니다.
- `agentfeed-frontend/.gitignore`는 `.env*.local`만 ignore해서 Next.js 표준 `.env.production`, `.env.development`가 추적 후보가 될 수 있었습니다.
- `agentfeed-dev/.gitignore`는 `.env`만 ignore해서 local orchestration secret variant가 추적 후보가 될 수 있었습니다.
- `AgentFeed-CLI/.gitignore`는 이미 `.env.*`와 `!.env.example` 계약을 갖고 있었습니다.

## 변경 사항

- Backend/Frontend/Dev repo의 `.gitignore`를 `.env.*` fail-closed 패턴으로 보강했습니다.
- 예시 파일은 계속 추적 가능하도록 `!.env.example`, `!.env.local.example` 예외를 유지/추가했습니다.
- `agentfeed-dev/scripts/test-all.sh`에 cross-repo static gate를 추가했습니다.
  - `.env.production`, `.env.development`, `.env.local`은 CLI/Backend/Frontend/Dev 모든 repo에서 ignored여야 합니다.
  - Backend `.env.example`, Frontend `.env.local.example`, Dev `.env.example`은 ignored가 아니어야 합니다.

## 검증 증거

- `git check-ignore .env.production .env.development .env.local` in CLI/Backend/Frontend/Dev → 모두 ignored.
- Backend `.env.example`, Frontend `.env.local.example`, Dev `.env.example` negative check → ignored 아님.
- `agentfeed-dev ./scripts/test-all.sh` → passed.
  - CLI: 20 files / 280 tests, typecheck, release preflight, audit 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, audit 0 vulnerabilities.
  - Backend: ruff, 254 pytest, Alembic offline migration chain.

> [!success]
> 실제 secret env variant는 모든 repo에서 fail-closed로 ignore되고, 예시 env 파일은 계속 추적 가능합니다.

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Integration - CLI Backend Frontend]]
- [[Commercial Readiness Hardening - Sidecar P1 Trust Boundaries 2026-06-01]]
