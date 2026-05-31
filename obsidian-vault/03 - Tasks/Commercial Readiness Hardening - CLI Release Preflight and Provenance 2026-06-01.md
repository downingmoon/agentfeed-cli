---
title: Commercial Readiness Hardening - CLI Release Preflight and Provenance 2026-06-01
date: 2026-06-01
tags:
  - agentfeed/cli
  - agentfeed/release
  - agentfeed/commercial-readiness
status: completed
aliases:
  - CLI release preflight provenance hardening
---

# CLI release preflight and provenance hardening

> [!success]
> `agentfeed-cli` npm publish 전에 repository checkout에서 실행하는 preflight가 package metadata, built tarball contents, local-only 파일 누락/누출, provenance caveat를 함께 검증합니다.

## 결과

- `package.json`에 `release:preflight` script와 `publishConfig.access: public`을 추가했습니다.
- `scripts/release-preflight.mjs`가 `npm pack --dry-run --json`을 실행하고 다음을 검증합니다.
  - package name/version과 `package.json` metadata 일치
  - built CLI entrypoint `dist/cli/index.js`와 `dist/version.js` 포함
  - `src/`, `tests/`, `scripts/`, `.agentfeed/`, `.omx/`, `.omc/`, `.env` 미포함
  - npm lifecycle stdout이 JSON 앞에 섞여도 pack JSON을 안정적으로 파싱
  - Windows-style path에서도 직접 실행 가드가 silent no-op으로 빠지지 않음
- `tests/release-preflight.test.ts`가 pack JSON parsing, forbidden tarball payload, metadata guardrail, direct invocation guard를 행동 기반으로 고정합니다.
- README가 `npm run release:preflight`를 release gate로 안내하고, npm provenance/trusted publishing 조건을 문서화합니다.
- 라이선스는 owner 결정 전까지 `UNLICENSED`로 유지하며, README에 all rights reserved / no usage grant caveat를 명시했습니다.

## 제품 계약

> [!important]
> 실제 npm publish 전에 반드시 `npm ci` 후 `npm run release:preflight`를 통과해야 합니다. 이 검증은 빌드/타입체크/테스트뿐 아니라 publish tarball에 로컬 draft, agent runtime state, source/test 파일이 들어가지 않는지 확인합니다.

> [!warning]
> npm provenance-backed publish는 public source repository와 repository metadata 일치를 요구합니다. GitHub repo를 private으로 유지하면 수동 publish는 가능하지만 npm provenance statement는 붙지 않습니다.

## 공식 문서 근거

- [npm provenance statements](https://docs.npmjs.com/generating-provenance-statements)
- [npm trusted publishers](https://docs.npmjs.com/trusted-publishers)
- [npm publish CLI options](https://docs.npmjs.com/cli/v10/commands/npm-publish/)

## 검증

- `node --check scripts/release-preflight.mjs` → passed
- `npm test -- --run tests/version.test.ts tests/release-preflight.test.ts` → 9 tests passed
- `npm run typecheck` → passed
- `npm run release:preflight` → passed
- `npm test -- --run && npm run typecheck` → 20 files / 258 tests passed, typecheck passed
- `make test` in `agentfeed-dev` → passed
- Subagent review 지적 3건 반영:
  - Windows/backslash direct-run guard silent no-op 방지
  - release preflight 행동 기반 테스트 추가
  - public `UNLICENSED` package 문구를 no usage grant로 명확화

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 CLI release preflight and provenance]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - CLI NPM Package Metadata 2026-06-01]]
