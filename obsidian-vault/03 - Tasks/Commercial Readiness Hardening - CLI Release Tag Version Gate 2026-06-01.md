---
title: Commercial Readiness Hardening - CLI Release Tag Version Gate 2026-06-01
aliases:
  - CLI release tag version gate
  - npm release matching version tag gate
  - AgentFeed CLI release ref safety

tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/release
  - supply-chain
status: done
created: 2026-06-01
repositories:
  - AgentFeed-CLI
---

# Commercial Readiness Hardening - CLI Release Tag Version Gate 2026-06-01

## 목표

> [!abstract]
> `workflow_dispatch` 또는 잘못된 `v*` tag에서 npm publish가 진행되어 package version과 release ref가 어긋나는 경로를 preflight에서 차단합니다.

## 변경 계약

- 로컬 `npm run release:preflight`는 계속 동작합니다.
- GitHub Actions release job 안에서는 `GITHUB_REF_TYPE=tag`이고 `GITHUB_REF_NAME=v${package.version}`일 때만 통과합니다.
- `GITHUB_REF=refs/tags/v${package.version}`만 있는 환경도 tag로 해석합니다.
- Branch/manual dispatch, version-mismatched tag는 `npm publish` 전에 실패해야 합니다.

## 구현 파일

- `scripts/release-preflight.mjs`
- `tests/release-preflight.test.ts`

## 검증 증거

> [!success] RED → GREEN
> - RED: `npx vitest run tests/release-preflight.test.ts --testNamePattern "matching version tag"`가 `validateReleaseGitRef is not a function`으로 실패.
> - GREEN: 같은 targeted test 통과.
> - Release preflight: `npm run release:preflight` 통과.
> - Targeted full release-preflight test + typecheck: `npm test -- --run tests/release-preflight.test.ts && npm run typecheck` 통과.
> - Ref guard smoke: CI branch `release:preflight` 통과, Release workflow branch ref 차단 확인.
> - CLI full test: `npm test -- --run` → 295 passed.
> - Cross-repo gate: `../agentfeed-dev/scripts/test-all.sh` → CLI 296, Frontend CI/build, Backend 268, Alembic chain 통과.

## 남은 검증

- [x] Remote GitHub CI: `downingmoon/agentfeed-cli` CI run `26763473746` → success (`b896fe2`)

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Integration - CLI Backend Frontend#2026-06-01 CLI release tag version gate]]
- [[Runtime Configuration#2026-06-01 Release supply-chain immutable action pins]]
