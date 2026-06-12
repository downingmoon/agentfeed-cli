---
title: CLI Open Human Renderer Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Open Human Renderer Split 2026-06-12

> [!success] 완료
> `agentfeed open`의 human-readable review URL rendering을 `src/cli/open-command.ts`로 분리했다. Draft resolution, trusted review URL validation, browser handoff side effect는 `cmdOpen`에 남기고 출력 조립만 helper로 이동했다.

## 변경 범위

- `src/cli/open-command.ts`
  - `renderOpenHumanLines`로 manual-open fallback과 browser-open success human output을 집중화했다.
  - Review URL block, warning section, guided next actions rendering을 helper 내부에서 조립한다.
  - 기존 `openJsonPayload`와 같은 command-specific boundary에 open 출력 계약을 모았다.
- `src/cli/index.ts`
  - `cmdOpen`은 draft selection, trust validation, browser opener 호출만 유지하고 human rendering을 helper에 위임한다.
  - open 전용 `printUrlBlock` dead helper를 제거했다.
- `tests/open-command.test.ts`
  - open JSON payload 기존 계약에 더해 open success/fallback human output을 순수 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npx vitest run tests/open-command.test.ts --reporter=verbose` → `renderOpenHumanLines is not a function`으로 실패.
- Green/focused:
  - `npm run build`
  - `npx vitest run tests/open-command.test.ts tests/cli-share.test.ts tests/cli-drafts.test.ts tests/cli-draft-navigation-actions.test.ts --reporter=verbose` → 4 files / 78 tests passed.
- Full suite: `npm run build && npm test -- --run` → 91 files / 754 tests passed.
- 실제 CLI smoke:
  - temp project에 uploaded local draft를 생성하고 `agentfeed open --id draft_open_smoke` human fallback output에서 AgentFeed review URL, Browser open failed, Summary, Review URL, Recommended order 확인.
  - `agentfeed open --id draft_open_smoke --json` JSON에서 draft_id/review_url/opened/next_actions shape 확인.
  - fake `open` browser command를 PATH에 주입해 browser-open success output에서 AgentFeed review opened, Opened review URL, Review URL, Recommended order 확인 및 opener log URL 일치 확인.
- 정적 검증:
  - `git diff --check`
  - pure LOC: `src/cli/index.ts` 1302, `src/cli/open-command.ts` 68, `tests/open-command.test.ts` 83.
  - strict grep: no `any`, `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion pattern in changed helper/test.
  - no-excuse TypeScript checker: no violations in changed TS files.
- LSP: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 배포/인프라

- 서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음. 기존 `agentfeed open` public behavior 유지.

## 다음 후보

- `src/cli/index.ts`가 여전히 oversized(1302 pure LOC)이므로 다음 slice에서도 command-specific orchestration/output 경계를 추가 분리한다.
- 후보: `discard` 완료 human renderer를 `discard-command`로 이동하거나 `open` draft-resolution error message helper를 별도 경계로 정리한다.
