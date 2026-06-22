---
title: CLI Rotate Browser Replacement Test Split 2026-06-22
aliases:
  - CLI rotate browser replacement test split
  - Rotate browser replacement fixture split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: f75dfa9a8ac6e7de4c0ed5c8ff363219c90d7000
---

# CLI Rotate Browser Replacement Test Split 2026-06-22

> [!success]
> `tests/cli-rotate-browser-replacement.test.ts`의 저장 credential 준비와 browser-approved rotation API fixture를 `tests/cli-rotate-browser-replacement-helpers.ts`로 분리했다.

## 변경 내용

- `tests/cli-rotate-browser-replacement.test.ts`
  - CLI 실행, 출력, 저장 credential 결과 검증만 남김.
  - 202 pure LOC 후보에서 78 pure LOC로 축소.
- `tests/cli-rotate-browser-replacement-helpers.ts`
  - saved credential fixture 생성.
  - metadata/status/session/exchange 응답을 제공하는 로컬 회전 서버 fixture 소유.
  - saved credential JSON parser 공유.
  - 147 pure LOC.

## 검증

- Baseline: `npm test -- --run tests/cli-rotate-browser-replacement.test.ts` → 1 file / 1 test passed.
- Targeted after split: `npm test -- --run tests/cli-rotate-browser-replacement.test.ts` → 1 file / 1 test passed.
- `npm run typecheck` → passed.
- `npm run build` → passed.
- `git diff --check` / staged `git diff --staged --check` → passed.
- Full CLI suite: `npm test -- --run` → 220 files / 848 tests passed.
- LSP diagnostics attempted for changed TypeScript files but failed with `Transport closed`; `typecheck`, `build`, and tests were used as fallback evidence.

## 후행 과제

- 다음 200+ pure LOC 후보:
  - `tests/cli-collect-command-ux.test.ts` — 201 pure LOC.
  - `tests/release-preflight.test.ts` — 200 pure LOC.
- 서버/인프라/CI/CD 변경 없음.
- 신규 앱 기능 없음.
- 서버 배포 금지 조건 때문에 push/deploy 없음.
