---
title: CLI Open Draft Resolver Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Open Draft Resolver Split 2026-06-12

> [!success] 완료
> `agentfeed open`의 draft id/latest 선택, pending draft guidance, malformed draft skip, no-uploaded draft guidance를 `src/cli/open-draft-resolver.ts`로 분리했다. browser open, saved review URL trust validation, JSON/human rendering은 기존 entrypoint/output helper 경계에 유지했다.

## 변경 범위

- `src/cli/open-draft-resolver.ts`
  - `resolveOpenDraft({ cwd, id, latest })`로 open 대상 draft 선택을 분리했다.
  - explicit `--id` pending draft는 publish/preview/drafts guidance로 실패한다.
  - `--latest`는 malformed draft 파일을 skip하고 최신 uploaded draft를 우선 반환한다.
  - uploaded draft가 없으면 최신 valid draft id를 포함한 publish guidance를 반환한다.
- `src/cli/index.ts`
  - inline `resolveOpenDraft(args)` 구현을 제거하고 helper 호출로 대체했다.
- `tests/open-draft-resolver.test.ts`
  - uploaded by id, pending by id, malformed skip + uploaded latest, no uploaded latest, no draft guidance를 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npm test -- --run tests/open-draft-resolver.test.ts` → helper 모듈 부재로 실패.
- Green/focused:
  - `npm test -- --run tests/open-draft-resolver.test.ts tests/cli-drafts.test.ts tests/open-command.test.ts` → 3 files / 29 tests passed.
  - `npm run build`
  - `npm run typecheck`
  - `npm test -- --run tests/open-draft-resolver.test.ts tests/cli-drafts.test.ts tests/open-command.test.ts tests/draft-id-path-safety.test.ts tests/cli-preview.test.ts` → 5 files / 45 tests passed.
- Full suite: `npm test -- --run` → 102 files / 806 tests passed.
- 실제 CLI smoke:
  - temp git project + isolated HOME에서 pending draft, uploaded draft, malformed draft file을 생성했다.
  - `agentfeed open --latest --json`이 malformed draft를 skip하고 uploaded draft review URL을 반환하며 test browser disabled fallback warning을 포함함을 확인했다.
  - `agentfeed open --id <pending>`이 publish/preview guidance로 실패함을 확인했다.
- 정적 검증:
  - `git diff --check`
  - no-excuse TypeScript checker: no violations in `src/cli/open-draft-resolver.ts`, `tests/open-draft-resolver.test.ts`.
  - pure LOC: `src/cli/index.ts` 982 → 955, `src/cli/open-draft-resolver.ts` 36, `tests/open-draft-resolver.test.ts` 79.
- LSP: `typescript-language-server` 미설치로 MCP LSP diagnostics 실행 불가.

## 배포/인프라

- 서버 배포, 개인서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 새 기능 추가 없음. 기존 `agentfeed open` draft selection ownership만 분리했다.

## 다음 후보

- `src/cli/index.ts`가 아직 955 pure LOC이므로 다음 safe slice에서 command orchestration 경계를 계속 줄인다.
- 후보: open review URL trust/browser handoff execution 분리 또는 publish command execution 분리.
