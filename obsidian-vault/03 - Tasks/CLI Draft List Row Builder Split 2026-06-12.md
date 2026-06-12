---
title: CLI Draft List Row Builder Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Draft List Row Builder Split 2026-06-12

> [!success] 완료
> `agentfeed drafts`의 saved draft row construction, title redaction, invalid draft fallback을 `src/cli/draft-list-rows.ts`로 분리했다. 출력 rendering은 기존 `draft-list-output` helper에 유지하고 CLI entrypoint는 orchestration만 담당하도록 축소했다.

## 변경 범위

- `src/cli/draft-list-rows.ts`
  - `buildDraftListRow(cwd, row)`로 valid/invalid draft row 조립을 분리했다.
  - draft title을 list surface에 내보내기 전 redaction + single-line compaction 하도록 `safeDraftListTitle`에 집중화했다.
  - malformed draft는 기존처럼 invalid row로 fail-soft 처리하고 JSON parse diagnostic을 보존한다.
- `src/cli/index.ts`
  - inline `safeDraftListTitle`, `draftListRow`, list title compaction 함수를 제거했다.
  - `cmdDrafts`는 project config 확인, draft file listing, helper 호출, output rendering만 수행한다.
- `tests/draft-list-rows.test.ts`
  - title email redaction, whitespace compaction, metric row preservation, invalid draft fallback을 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npm test -- --run tests/draft-list-rows.test.ts` → helper 모듈 부재로 실패.
- Green/focused:
  - `npm test -- --run tests/draft-list-rows.test.ts tests/cli-drafts.test.ts tests/draft-list-output.test.ts` → 3 files / 22 tests passed.
  - `npm run build`
  - `npm run typecheck`
  - `npm test -- --run tests/draft-list-rows.test.ts tests/cli-drafts.test.ts tests/draft-list-output.test.ts tests/cli-share.test.ts tests/cli-collect.test.ts tests/cli-preview.test.ts` → 6 files / 112 tests passed.
- Full suite: `npm test -- --run` → 99 files / 795 tests passed.
- 실제 CLI smoke:
  - temp git project + isolated HOME에서 `agentfeed drafts`와 `agentfeed drafts --json` 실행.
  - valid draft title의 `alice@example.com`이 `[REDACTED_EMAIL]`로 redaction되고 newline이 single-line으로 collapse됨을 확인했다.
  - malformed `draft_broken.json`이 invalid row로 표시되고 summary `{ total: 2, valid: 1, invalid: 1, pending: 1, uploaded: 0 }`을 유지함을 확인했다.
- 정적 검증:
  - `git diff --check`
  - no-excuse TypeScript checker: no violations in `src/cli/draft-list-rows.ts`, `tests/draft-list-rows.test.ts`.
  - pure LOC: `src/cli/index.ts` 1039 → 1005, `src/cli/draft-list-rows.ts` 43, `tests/draft-list-rows.test.ts` 71.
- LSP: `typescript-language-server` 미설치로 MCP LSP diagnostics 실행 불가.

## 배포/인프라

- 서버 배포, 개인서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 새 기능 추가 없음. 기존 `agentfeed drafts` row construction ownership만 분리했다.

## 다음 후보

- `src/cli/index.ts`가 아직 1005 pure LOC이므로 다음 safe slice에서 command orchestration 경계를 계속 줄인다.
- 후보: preview/read draft sanitization flow 분리 또는 doctor account/API checks assembly 분리.
