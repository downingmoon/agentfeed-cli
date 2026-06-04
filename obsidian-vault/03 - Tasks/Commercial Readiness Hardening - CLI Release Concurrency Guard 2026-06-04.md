---
title: Commercial Readiness Hardening - CLI Release Concurrency Guard 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/release
  - agentfeed/ci
  - hardening
status: completed
created: 2026-06-04
aliases:
  - CLI release concurrency guard
---

# Commercial Readiness Hardening - CLI Release Concurrency Guard 2026-06-04

## 목적

`agentfeed-cli` npm 배포는 trusted publishing, version tag guard, tarball smoke까지 이미 갖췄지만 같은 tag/ref에서 release workflow가 중복 실행되면 두 publish lane이 동시에 npm publish를 시도할 수 있었다.

> [!important]
> npm publish는 한 번 성공하면 같은 version 재배포가 불가능하므로, release lane은 version tag 단위로 직렬화되어야 한다.

## 변경 요약

- `agentfeed-cli/.github/workflows/release.yml`
  - `concurrency.group: npm-release-${{ github.ref }}` 추가.
  - `cancel-in-progress: false`로 이미 시작된 publish를 취소하지 않도록 고정.
- `agentfeed-cli/scripts/release-preflight.mjs`
  - release workflow가 concurrency를 선언하는지 검증.
  - concurrency group이 `github.ref` 기반인지 검증.
  - publish 도중 취소 위험을 막기 위해 `cancel-in-progress: false`를 강제.
- `agentfeed-cli/tests/release-preflight.test.ts`
  - concurrency 누락/고정 group/cancel true를 release contract 위반으로 테스트.

## 검증

> [!success] Fresh local verification
> - `npm test -- --run tests/release-preflight.test.ts` ✅ `13 passed`
> - `npm run typecheck` ✅
> - `npm run build` ✅
> - `npm test -- --run` ✅ `396 passed`
> - `npm run release:preflight` ✅

## 남은 외부 차단 조건

> [!failure]
> 상용 hosted readiness는 아직 외부 인프라 상태 때문에 완료로 볼 수 없다.
> - `api.agentfeed.dev` DNS lookup: `ENOTFOUND`
> - `https://agentfeed.dev/` root: `307 /login`

## 관련 노트

- [[Commercial Readiness Hardening - Windows Package Wrapper Smoke 2026-06-04]]
- [[Commercial Readiness Hardening - Frontend Hosted Readiness Required 2026-06-04]]
- [[Commercial Readiness Hardening - Hosted Readiness Diagnostics 2026-06-04]]
- [[Active Tasks]]
