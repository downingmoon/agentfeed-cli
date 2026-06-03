---
title: Commercial Readiness Hardening - Windows Package Wrapper Smoke 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/release
  - hardening
status: completed
created: 2026-06-04
aliases:
  - Windows package wrapper smoke
---

# Commercial Readiness Hardening - Windows Package Wrapper Smoke 2026-06-04

## 목적

CLI npm 패키지는 `agentfeed` bin을 배포하지만 Windows에서는 npm이 `agentfeed.cmd` shim을 생성한다. 기존 release preflight는 설치된 tarball smoke를 수행했지만 GitHub Windows CI job은 DPAPI credential smoke만 실행했고, release-path package wrapper smoke가 Windows에서 직접 검증되지 않았다.

> [!important]
> 상용 배포 전 Windows 사용자가 `npm install -g agentfeed-cli` 후 `agentfeed --help` / `agentfeed --version`을 실행하는 경로가 CI에서 검증되어야 한다.

## 변경 요약

- `scripts/release-preflight.mjs`
  - installed bin path helper를 platform-aware export로 분리했다.
  - Windows `.cmd` npm shim 실행 시 `shell: true`를 사용하도록 `installedBinExecOptions()`를 추가했다.
  - Windows runner에서 `npm` command가 `ENOENT`가 되는 경로를 막기 위해 `npm.cmd` + shell execution helper를 추가했다.
  - installed package smoke가 같은 helper를 사용해 tarball install 후 bin wrapper를 실행한다.
- `.github/workflows/ci.yml`
  - `windows-native-keychain` job에 `Windows npm package wrapper smoke` step 추가.
  - Windows runner에서 `node scripts/release-preflight.mjs`를 실행해 실제 npm-generated `agentfeed.cmd` wrapper path를 검증한다.
- Tests / README
  - release-preflight contract가 Windows DPAPI + Windows package wrapper smoke 순서를 요구한다.
  - README release section에 Windows `agentfeed.cmd` wrapper CI coverage를 명시했다.

## 검증

> [!success] Fresh local verification
> - `npm test -- --run tests/release-preflight.test.ts tests/version.test.ts` ✅ — 17 tests
> - `npm run typecheck` ✅
> - `npm run release:preflight` ✅ — build/typecheck/396 tests/npm pack/install smoke 통과
> - First remote Windows run exposed `spawnSync npm ENOENT`; fixed by resolving `npm.cmd` on Windows and executing command shims through shell.
> - GitHub Actions CI `26899124155` ✅ — `CLI release gate` success, `Windows native credential smoke` success including package wrapper smoke.

## 남은 외부 차단 조건

- Windows runner package wrapper smoke는 GitHub Actions `26899124155`에서 통과했다.
- Default commercial readiness의 hosted blocker(`api.agentfeed.dev` DNS, `agentfeed.dev/` stale `/login`)는 별도 외부 배포/DNS 작업으로 유지한다.

## 관련 노트

- [[Commercial Readiness Hardening - CLI Release Workflow Parity 2026-06-02]]
- [[Commercial Readiness Hardening - Installed CLI Tarball Smoke and Manual Cross Repo CI 2026-06-02]]
- [[Commercial Readiness Hardening - Windows DPAPI Native CI 2026-06-03]]
- [[Commercial Readiness Hardening - Cached Publish Cursor and Branch Drift Gates 2026-06-04]]
- [[Active Tasks]]
- [[AgentFeed CLI MOC]]
