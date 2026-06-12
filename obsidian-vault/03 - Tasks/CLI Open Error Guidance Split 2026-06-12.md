---
title: CLI Open Error Guidance Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Open Error Guidance Split 2026-06-12

> [!success] 완료
> `agentfeed open`의 pending draft, no local draft, no uploaded draft error guidance rendering을 `src/cli/open-command.ts`로 분리했다. Draft selection과 trust validation은 `cmdOpen`/`resolveOpenDraft`에 남기고 사용자-facing recovery message 조립만 helper로 이동했다.

## 변경 범위

- `src/cli/open-command.ts`
  - `notUploadedDraftMessage`로 review URL이 없는 draft-by-id 오류 guidance를 집중화했다.
  - `noUploadedDraftsMessage`로 pending-only local draft 상태의 publish/share/drafts recovery guidance를 집중화했다.
  - `noOpenableDraftsMessage`로 no-drafts/no-uploaded-review empty state guidance를 집중화했다.
- `src/cli/index.ts`
  - `resolveOpenDraft`와 `cmdOpen`은 draft lookup 및 validation 흐름만 유지하고 open error guidance를 helper에 위임한다.
  - open error message local helper 3개를 제거했다.
- `tests/open-command.test.ts`
  - 기존 open JSON/human output 계약에 더해 pending/no-uploaded/no-drafts error guidance를 순수 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npx vitest run tests/open-command.test.ts --reporter=verbose` → guidance helper export 부재로 실패.
- Green/focused:
  - `npm run build`
  - `npx vitest run tests/open-command.test.ts tests/cli-drafts.test.ts tests/cli-share.test.ts --reporter=verbose` → 3 files / 78 tests passed.
- Full suite: `npm run build && npm test -- --run` → 91 files / 759 tests passed.
- 실제 CLI smoke:
  - temp project `agentfeed open --latest` no-drafts failure에서 no uploaded review draft guidance 확인.
  - temp project pending local draft 생성 후 `agentfeed open --id draft_pending_error_smoke` failure에서 publish/preview/drafts guidance 확인.
  - 같은 temp project `agentfeed open --latest` failure에서 newest pending draft publish/share/drafts guidance 확인.
- 정적 검증:
  - `git diff --check`
  - pure LOC: `src/cli/index.ts` 1248, `src/cli/open-command.ts` 97, `tests/open-command.test.ts` 112.
  - strict grep: no `any`, `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion pattern in changed helper/test.
  - no-excuse TypeScript checker: no violations in changed TS files.
- LSP: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 배포/인프라

- 서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음. 기존 `agentfeed open` public error behavior 유지.

## 다음 후보

- `src/cli/index.ts`가 여전히 oversized(1248 pure LOC)이므로 다음 slice에서도 command-specific orchestration/output 경계를 추가 분리한다.
- 후보: `publish/share` confirmation-adjacent output 또는 upload preflight/recovery message boundary를 더 줄인다.
