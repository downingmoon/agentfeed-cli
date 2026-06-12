---
title: CLI Review Handoff Policy Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Review Handoff Policy Split 2026-06-12

> [!success] 완료
> review URL trust validation, clipboard/browser side-effect policy, and handoff formatting ownership을 `src/cli/review-handoff.ts`로 통합했다. `src/cli/index.ts`는 share/publish/upload orchestration에서 handoff helper를 호출만 하도록 축소했다.

## 변경 범위

- `src/cli/review-handoff.ts`
  - `shouldCopyReviewUrl` 추가로 JSON mode clipboard opt-in 정책 고정.
  - `handoffReviewUrl` 추가로 trust-policy-before-side-effect 순서 고정.
  - side-effect adapter 주입을 지원해 clipboard/browser 동작을 단위 테스트에서 안전하게 관찰.
  - 기존 `reviewUrlHandoffLines` formatting과 handoff payload 생성 정책을 같은 모듈에서 관리.
- `src/cli/index.ts`
  - review URL handoff helper 62 pure LOC 제거.
  - `copyToClipboard` 직접 import 제거.
  - `cmdOpen`의 saved review URL open 검증은 기존 책임대로 유지.
- `tests/review-handoff.test.ts`
  - JSON mode clipboard explicit-only 정책 고정.
  - untrusted review URL이 clipboard/browser side effect 전에 거절되는지 고정.
  - trusted URL에서 clipboard success/browser failure handoff payload를 고정.
- `tests/cli-handoff-policy.test.ts`
  - trust-policy source inspection 대상을 `review-handoff.ts`로 이동.

## 검증

- Red: `npm test -- --run tests/review-handoff.test.ts`가 구현 전 `shouldCopyReviewUrl is not a function` / `handoffReviewUrl is not a function`으로 실패.
- Build: `npm run build` 통과.
- Typecheck: `npm run typecheck` 통과.
- Focused tests: `npm test -- --run tests/review-handoff.test.ts tests/cli-handoff-policy.test.ts tests/cli-share.test.ts tests/upload-output.test.ts tests/publish-output.test.ts tests/open-command.test.ts` → 6 files / 71 tests 통과.
- Full regression: `npm test -- --run` → 94 files / 768 tests 통과.
- CLI smoke: temp git project + isolated HOME + local fake AgentFeed API + fake `pbcopy`/`open`으로 `share --json --all --clipboard --open-review` 실행. JSON handoff payload, clipboard log, browser log가 동일 review URL을 기록함을 확인.
- Static: `git diff --check`, OMO TypeScript no-excuse checker 통과.
- LOC: `src/cli/index.ts` 1229 → 1174 pure LOC, `src/cli/review-handoff.ts` 101 pure LOC.
- LSP: `typescript-language-server` 미설치/이전 declined 상태라 MCP LSP diagnostics 실행 불가.

## 효과

- CLI-Frontend-Backend 사이에서 review URL handoff의 trust/side-effect/formatting 정책이 한 module에 모여 drift 위험을 낮췄다.
- JSON mode는 `--clipboard`가 명시된 경우에만 clipboard side effect를 수행한다는 계약을 단위 테스트와 CLI smoke로 고정했다.
- 신규 기능, 서버, infra, CI/CD, 배포 작업은 수행하지 않았다.

## 후속

> [!todo]
> `src/cli/index.ts`는 여전히 250 pure LOC 초과 inherited defect다. 다음 safe slice는 upload preflight recovery, token input recovery, 또는 draft selection helpers처럼 observable CLI 계약을 red test로 고정할 수 있는 부분만 분리한다.
