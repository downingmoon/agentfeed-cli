---
title: CLI Review Auto Open Override
date: 2026-06-03
tags:
  - agentfeed
  - cli
  - commercial-readiness
  - ux
  - testing
status: completed
---

# CLI Review Auto Open Override

## Context

테스트 반복 중 `http://localhost:3001/worklogs/.../review` 브라우저 창이 계속 열리는 것처럼 보이는 문제가 확인되었습니다. 원인은 실제 운영 페이지가 아니라 CLI의 review handoff 기능과 mock review URL 조합입니다.

> [!info]
> 기존 Vitest guard는 실제 OS browser opener 실행을 차단하지만, 제품 UX 관점에서는 사용자가 프로젝트 설정의 `collection.open_review_after_upload`를 한 번의 명령에서 명시적으로 끌 방법도 필요했습니다.

## Changes

- CLI `share` 옵션에 `--no-open-review` 추가.
- CLI `publish` 옵션에 `--no-open-review` 추가.
- `collect --upload --no-open-review`가 내부 `publish` 호출로 override를 전달하도록 보강.
- JSON automation은 기존처럼 기본 browser/clipboard side effect 없이 유지.
- README와 CLI help에 `--no-open-review` 사용법 추가.
- Regression test 추가: 프로젝트 설정상 review auto-open이 가능한 상황에서도 `publish --no-open-review`가 fake browser opener를 호출하지 않음.

## Verification evidence

```bash
npm test -- --run tests/share.test.ts tests/cli-share.test.ts -t "parses share-specific options|explicitly suppress|opens the review URL after publish|does not auto-open review URLs in CI"
npm run build
npm run typecheck
npm test -- --run
npm run release:preflight
```

결과:

- Targeted tests: 2 files passed, 4 tests passed.
- Full CLI tests: 23 files passed, 373 tests passed.
- Release preflight: passed, including build/typecheck/test, npm pack dry-run, built CLI smoke, installed package smoke.

## Related notes

- [[Commercial Readiness Hardening - CLI Test Browser Side Effect Guard 2026-06-03]]
- [[Commercial Readiness Hardening - CLI Publish JSON Handoff Contract 2026-06-03]]
- [[Runtime Configuration]]
