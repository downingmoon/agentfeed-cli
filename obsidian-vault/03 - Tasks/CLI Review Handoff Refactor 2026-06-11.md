---
title: CLI Review Handoff Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - agentfeed/enterprise-audit
status: done
---

# CLI Review Handoff Refactor 2026-06-11

## 목적

upload 이후 review URL handoff는 사용자가 private review draft로 이동하거나, 자동 복사/브라우저 열기가 실패했을 때 수동 URL을 확인하는 핵심 UX다. 기존 `src/cli/index.ts`에는 review URL trust policy side effect와 handoff 출력 line formatting이 함께 있었다.

이번 slice는 신규 기능 없이 handoff line formatting만 순수 모듈로 분리하고, trust policy와 side effect 실행 순서는 source-contract test로 계속 고정했다.

## 변경

- `src/cli/review-handoff.ts` 추가.
  - `reviewUrlHandoffLines()` 분리.
  - clipboard/browser 성공 메시지와 warning/manual URL fallback formatting 유지.
- `src/cli/index.ts`는 `handoffReviewUrl()`의 URL trust policy, clipboard/browser side effect orchestration만 유지.
- `tests/cli-handoff-policy.test.ts`를 refactor 이후 구조에 맞게 조정.
  - `index.ts`에서 `isTrustedReviewUrl`이 `copyToClipboard`/`openBrowser`보다 먼저 실행되는 계약 유지.
  - `review-handoff.ts`가 human-readable handoff formatting을 유지하는 계약 추가.

## 검증

- `npm run build` 통과.
- `npx vitest run tests/cli-handoff-policy.test.ts tests/cli-share.test.ts --reporter=verbose` 통과: 2 files / 57 tests.
- `npm test -- --run` 통과: 42 files / 624 tests.
- `git diff --check` 통과.
- 변경 TS/test 파일 hygiene grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum` 없음.
- LSP diagnostics는 현재 환경에 `typescript-language-server`가 설치되어 있지 않아 실행 불가. `tsc` build와 vitest를 대체 evidence로 사용.

## LOC 상태

- `src/cli/index.ts`: 약 3,255 pure LOC → 약 3,233 pure LOC.
- `src/cli/review-handoff.ts`: 약 28 pure LOC.

## 후행 과제

> [!warning]
> `src/cli/index.ts`는 여전히 oversized entrypoint다. 다음 slice는 `previewNextActions()`/`collectJsonNextActions()`/`remotePreviewNextActions()` 같은 draft next-action 계산을 별도 guidance 모듈로 분리해 command orchestration과 사용자 안내 계산을 계속 분리하는 것이 좋다.

## 관련

- [[CLI Upload Guidance Refactor 2026-06-11]]
- [[CLI Auth Result Refactor 2026-06-11]]
- [[Active Tasks]]
