---
title: CLI Trusted Publishing Enforcement
date: 2026-06-01
tags:
  - agentfeed/cli
  - agentfeed/release
  - agentfeed/commercial-readiness
status: done
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Commercial Readiness Hardening - CLI Release Preflight and Provenance 2026-06-01]]"
  - "[[Active Tasks]]"
---

# CLI Trusted Publishing Enforcement

> [!success]
> `agentfeed-cli` release gate가 단순 provenance 문서화에서 GitHub Actions OIDC trusted publishing workflow와 preflight 검증 계약으로 올라갔습니다.

## 배경

이전 release hardening은 tarball/preflight와 private repo provenance caveat를 문서화했지만, 실제 CI publish path가 없어서 `id-token: write`, Node/npm trusted publishing runtime, long-lived token 금지 같은 release-time 조건은 코드로 고정되지 않았습니다.

## 변경 계약

- `package.json`은 `publishConfig.access: public`과 `publishConfig.provenance: true`를 동시에 요구합니다.
- `.github/workflows/release.yml`은 tag/manual release 전용 publish workflow입니다.
- release workflow는 GitHub-hosted `ubuntu-latest`, `id-token: write`, `contents: read`, `environment: npm-publish`를 사용합니다.
- trusted publishing runtime은 Node.js `22.14.0`과 npm `11.6.0`으로 고정합니다.
- publish 직전 `npm run release:preflight`를 실행합니다.
- trusted publishing publish command는 `npm publish --access public`만 사용합니다. OIDC trusted publishing에서는 npm이 provenance를 자동 생성하므로 `--provenance` flag를 넣지 않습니다.
- release workflow는 `NODE_AUTH_TOKEN` / `NPM_TOKEN` 같은 장기 npm token에 의존하지 않습니다.
- release build에서는 dependency cache를 사용하지 않습니다.
- `release:preflight`가 release workflow contract까지 검증합니다.

> [!warning]
> npm provenance는 public source repository + public package 조건에서만 생성됩니다. 현재 repo를 private로 유지한 상태에서는 trusted publishing을 설정해도 provenance statement가 생성되지 않으므로, production npm release 전 repo visibility와 npm trusted publisher 설정을 맞춰야 합니다.

## 수정 파일

- `.github/workflows/release.yml`
- `package.json`
- `scripts/release-preflight.mjs`
- `tests/release-preflight.test.ts`
- `tests/version.test.ts`
- `README.md`
- `src/utils/open-browser.ts`

## 추가 안정화

`release:preflight` 전체 테스트 중 `agentfeed open`의 fake browser opener close event가 로컬 부하에서 1.5초를 넘기며 false fallback으로 기록되는 flake를 확인했습니다. Browser opener timeout을 5초로 늘려 실제 opener 성공을 더 안정적으로 기다리도록 보강했습니다.

## 공식 문서 근거

- [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/)
- [npm provenance statements](https://docs.npmjs.com/generating-provenance-statements/)
- [npm publish CLI v11](https://docs.npmjs.com/cli/v11/commands/npm-publish/)

## 검증 증거

- `node --check scripts/release-preflight.mjs` → passed
- `npm test -- --run tests/release-preflight.test.ts tests/version.test.ts` → passed, 11 tests
- `npm test -- --run tests/cli-share.test.ts -t "trusts local review URLs"` → passed
- `npm run release:preflight` → passed
- `agentfeed-dev make test` → passed
  - CLI tests/typecheck/release preflight/audit
  - Frontend CI build/contracts/audit
  - Backend ruff/pytest 226 tests/Alembic offline migration chain
  - OpenAPI contract gate

## 후속 후보

- GitHub repo public 전환 시 npm package settings에서 trusted publisher를 `Release` workflow로 등록
- 실제 `workflow_dispatch` dry-run에 가까운 staged release rehearsal 추가 검토
- npm package page provenance badge 확인 절차 문서화

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 CLI trusted publishing enforcement]]
- [[Active Tasks#P1 후보]]
