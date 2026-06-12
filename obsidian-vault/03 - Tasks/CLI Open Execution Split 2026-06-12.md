---
title: CLI Open Execution Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Open Execution Split 2026-06-12

> [!success] 완료
> `agentfeed open`의 saved review URL trust validation, invalid API URL warning capture, browser-open fallback warning 조립을 `src/cli/open-execution.ts`로 분리했다. draft 선택과 출력 rendering 계약은 기존 `open-draft-resolver` / `open-command` 경계에 유지했다.

## 변경 범위

- `src/cli/open-execution.ts`
  - `openReviewDraft({ cwd, draft })`로 review URL presence, trusted URL validation, invalid API URL warning tolerance, browser open side effect를 분리했다.
  - human output warning과 JSON warning을 분리해 기존 동작을 보존했다. browser-open 실패 warning은 JSON payload에는 포함하고, human output은 기존 manual-open fallback 문구를 유지한다.
  - `loadCredentialsWithMetadata`와 `openBrowser` dependency injection을 제공해 side effect 없이 trust/fallback 계약을 테스트한다.
- `src/cli/index.ts`
  - inline saved review URL trust/browser-open 실행 로직을 제거하고 `openReviewDraft` 결과를 `openJsonPayload` / `renderOpenHumanLines`에 전달한다.
  - `DEFAULT_API_BASE_URL`, `isTrustedReviewUrl`, `invalidApiBaseUrlMessage`, `openBrowser` 직접 의존을 entrypoint에서 제거했다.
- `tests/open-execution.test.ts`
  - trusted default review URL open, invalid API URL warning tolerance, browser fallback JSON-only warning, untrusted review URL rejection을 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npm test -- --run tests/open-execution.test.ts` → `src/cli/open-execution.js` 모듈 부재로 실패.
- Green/focused:
  - `npm test -- --run tests/open-execution.test.ts` → 1 file / 4 tests passed.
  - `npm run typecheck`
  - `npm run build`
  - `npm test -- --run tests/open-execution.test.ts tests/cli-drafts.test.ts tests/open-command.test.ts tests/open-draft-resolver.test.ts tests/draft-id-path-safety.test.ts tests/cli-preview.test.ts` → 6 files / 49 tests passed.
- Full suite: `npm test -- --run` → 103 files / 810 tests passed.
- 실제 CLI smoke:
  - temp project에서 uploaded draft와 untrusted saved review URL draft를 생성했다.
  - `agentfeed open --id draft_uploaded_smoke --json`이 browser disabled 상태에서 `opened: false`와 manual-open warning을 반환함을 확인했다.
  - invalid `AGENTFEED_API_BASE_URL` 상태의 human `agentfeed open --id draft_uploaded_smoke`가 invalid API warning과 manual browser fallback을 함께 출력함을 확인했다.
  - `agentfeed open --id draft_bad_smoke --json`이 saved review URL invalid 오류로 browser open 전에 실패함을 확인했다.
- 정적 검증:
  - `git diff --check`
  - no-excuse TypeScript checker: no violations in `src/cli/open-execution.ts`, `tests/open-execution.test.ts`.
  - pure LOC: `src/cli/index.ts` 955 → 939, `src/cli/open-execution.ts` 62, `tests/open-execution.test.ts` 101.
- LSP: `typescript-language-server` 미설치로 MCP LSP diagnostics 실행 불가.

## 배포/인프라

- 서버 배포, 개인서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 새 기능 추가 없음. 기존 `agentfeed open` review execution ownership만 분리했다.

## 다음 후보

- `src/cli/index.ts`가 아직 939 pure LOC이므로 다음 safe slice에서 command orchestration 경계를 계속 줄인다.
- 후보: publish command execution 분리 또는 auth command orchestration 잔여 boundary 축소.
