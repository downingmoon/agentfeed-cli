---
title: CLI Runtime Policy Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Runtime Policy Split 2026-06-12

> [!success] 완료
> CI 환경 감지, upload confirmation 요구 여부, upload 후 review URL 자동 open 정책을 `src/cli/runtime-policy.ts`로 분리했다. `publish`/`share`의 operator-facing 출력, upload flow, browser handoff, project config 동작은 변경하지 않았다.

## 변경 범위

- `src/cli/runtime-policy.ts`
  - `CI_ENVIRONMENT_VARIABLES`와 truthy env 판정을 helper로 분리했다.
  - `shouldRequireUploadConfirmation`으로 `--json`/`--yes` 확인 생략 정책을 순수 함수로 고정했다.
  - `shouldOpenReviewAfterUpload`으로 `--open-review`, `--no-open`, CI suppression, project config fallback 순서를 집중화했다.
- `src/cli/index.ts`
  - runtime policy helper를 import하도록 바꾸고 inline 정책 함수를 제거했다.
- `tests/runtime-policy.test.ts`
  - CI env matrix, confirmation gate, explicit open/no-open/config/CI/fail-closed 분기를 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npm test -- --run tests/runtime-policy.test.ts` → helper 모듈 부재로 실패.
- Green/unit: `npm test -- --run tests/runtime-policy.test.ts` → 1 file / 7 tests passed.
- Build/typecheck:
  - `npm run build`
  - `npm run typecheck`
- Focused regression: `npm test -- --run tests/runtime-policy.test.ts tests/cli-share.test.ts tests/cli-collect.test.ts tests/upload-output.test.ts tests/share.test.ts tests/command-arg-specs.test.ts tests/cli-help.test.ts` → 7 files / 141 tests passed.
- Full suite: `npm test -- --run` → 98 files / 793 tests passed.
- 실제 CLI smoke:
  - temp git project + isolated HOME + local fake AgentFeed API + fake browser opener로 실행했다.
  - `CI=1 agentfeed publish --id <draft> --yes`에서 review URL은 출력되지만 browser opener는 호출되지 않음을 확인했다.
  - `CI=1 agentfeed publish --id <draft> --yes --open-review`에서 `Review URL opened in browser.`와 fake browser log의 review URL 기록을 확인했다.
- 정적 검증:
  - `git diff --check`
  - no-excuse TypeScript checker: no violations in `src/cli/runtime-policy.ts`, `tests/runtime-policy.test.ts`.
  - pure LOC: `src/cli/index.ts` 1073 → 1039, `src/cli/runtime-policy.ts` 50.
- LSP: `typescript-language-server` 미설치로 MCP LSP diagnostics 실행 불가.

## 배포/인프라

- 서버 배포, 개인서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 새 기능 추가 없음. 기존 upload/open-review runtime policy의 소유권만 분리했다.

## 다음 후보

- `src/cli/index.ts`가 여전히 1039 pure LOC이므로 다음 safe slice에서 command orchestration 경계를 계속 줄인다.
- 후보: draft sanitization/title rendering 분리 또는 doctor account/API checks assembly 분리.
