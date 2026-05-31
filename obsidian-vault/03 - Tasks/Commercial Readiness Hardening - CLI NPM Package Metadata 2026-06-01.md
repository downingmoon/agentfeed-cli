---
title: Commercial Readiness Hardening - CLI NPM Package Metadata 2026-06-01
aliases:
  - CLI NPM Package Metadata
  - AgentFeed CLI Package Launch Metadata
status: done
date: 2026-06-01
tags:
  - agentfeed/cli
  - agentfeed/release
  - agentfeed/commercial-readiness
---

# Commercial Readiness Hardening - CLI NPM Package Metadata 2026-06-01

## 결과

> [!success]
> CLI npm package가 discovery/support/reproducibility에 필요한 launch metadata를 갖고, README가 현재 publication state를 과장하지 않도록 정리되었습니다.

## 변경 요약

- `package.json`에 npm discovery keywords를 추가했습니다.
- package homepage를 `https://agentfeed.dev`로 고정했습니다.
- GitHub repository와 bugs URL을 `downingmoon/agentfeed-cli`로 명시했습니다.
- `packageManager`를 현재 release toolchain인 `npm@11.6.0`로 고정했습니다.
- README Install 섹션에 Node.js 20+ 요구사항을 명시했습니다.
- README의 “이미 published” 표현을 “publishing 이후 command 제공” 표현으로 바꿨습니다.
- README에 pre-publish local tarball 검증 경로(`npm ci`, `npm pack --dry-run`)를 추가했습니다.
- `tests/version.test.ts`가 launch metadata와 package manager 값을 회귀 테스트로 고정합니다.

## 계약 기준

> [!important]
> `npm view agentfeed-cli version`은 2026-06-01 기준 registry `E404`를 반환했습니다. 그래서 README는 실제 publish 전까지 “이미 published”라고 말하지 않아야 합니다.

> [!warning]
> `license`는 추가하지 않았습니다. 공개/상용 배포 라이선스는 제품·법무 결정이므로 기본값을 추정하지 않습니다.

> [!note]
> GitHub repository/bugs metadata는 현재 `downingmoon/agentfeed-cli`를 가리킵니다. repo를 private로 유지한 채 public npm launch를 한다면 public support URL 또는 repo visibility 정책을 별도로 확정해야 합니다.

## 검증

- `npm view agentfeed-cli version` → `E404 Not Found` 확인
- `npm --version` → `11.6.0`
- `node --version` → `v24.7.0`
- `npm test -- --run tests/version.test.ts` → passed, 3 tests
- `npm run typecheck` → passed
- `npm pack --dry-run --json` → passed, prepack full suite 252 tests, package includes `README.md`, `package.json`, and `dist/**`; `dist/cli/index.js` mode `493`
- `git diff --check` → passed

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 CLI npm package launch metadata]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Release and Public Gates 2026-05-30]]
