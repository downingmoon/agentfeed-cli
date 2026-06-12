---
title: CLI Share Upload Execution Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Share Upload Execution Split 2026-06-12

> [!success] 완료
> `agentfeed share`의 upload confirmation gate, upload preflight, publish API call, saved-draft reread/sanitize, cursor marking, review URL handoff policy를 `src/cli/share-upload-execution.ts`로 분리했다. share collection/preview와 JSON/human output rendering은 기존 경계에 유지했다.

## 변경 범위

- `src/cli/share-upload-execution.ts`
  - `runShareUploadCommand({ cwd, draft, credentials, flags })`로 share upload 실행 흐름을 분리했다.
  - `confirmation_required` / `uploaded` discriminated union으로 human upload 전 confirmation pause와 완료 결과를 명시했다.
  - JSON share upload는 기존처럼 confirmation 없이 진행하고, saved draft를 reread/sanitize한 뒤 cursor mark와 JSON handoff policy를 적용한다.
  - human share upload는 기존처럼 `--yes` 없이는 preflight/API 호출 없이 pause하고, 업로드 시 clipboard 기본 handoff와 project-aware open policy를 유지한다.
  - preflight, publish, draft reread/sanitize, cursor mark, handoff/open policy를 dependency seam으로 고정해 테스트 가능한 실행 경계로 만들었다.
- `src/cli/index.ts`
  - inline `cmdShare` upload 로직을 제거하고 `runShareUploadCommand` 결과를 기존 share/upload output helper로 렌더링한다.
- `tests/share-upload-execution.test.ts`
  - no-`--yes` human share가 preflight/upload를 실행하지 않음을 고정했다.
  - JSON share upload가 saved draft reread/sanitize, cursor mark, explicit clipboard, config-independent open policy, review base propagation을 유지함을 고정했다.
  - human `--yes` share upload가 default clipboard와 project-aware open policy를 유지함을 고정했다.
- `tests/cli-handoff-policy.test.ts`
  - share upload 실행이 helper로 이동된 뒤에도 모든 upload handoff call이 active API base와 review base를 넘기는지 `src/cli/index.ts` + `src/cli/publish-execution.ts` + `src/cli/share-upload-execution.ts` 전체로 검사한다.

## 검증

- Red test 확인: `npm test -- --run tests/share-upload-execution.test.ts` → `src/cli/share-upload-execution.js` 모듈 부재로 실패.
- Green/focused:
  - `npm test -- --run tests/share-upload-execution.test.ts` → 1 file / 3 tests passed.
  - `npm run typecheck`
  - `npm run build`
  - `npm test -- --run tests/share-upload-execution.test.ts tests/share-output.test.ts tests/upload-output.test.ts tests/upload-preflight.test.ts tests/review-handoff.test.ts tests/runtime-policy.test.ts tests/cli-share.test.ts tests/cli-handoff-policy.test.ts` → 8 files / 82 tests passed.
- Full suite: `npm test -- --run` → 105 files / 816 tests passed.
- 실제 CLI smoke:
  - temp git project + local fake AgentFeed API로 `agentfeed share --source codex --session-file <file> --all` confirmation pause를 확인했다.
  - confirmation pause 중 metadata/token/ingest network call count가 모두 0임을 확인했다.
  - `agentfeed share --json --yes --source codex --session-file <file> --all --no-clipboard --no-open-review`가 fake metadata/token/ingest를 각각 1회 호출하고 parseable JSON upload payload, disabled clipboard/browser handoff, trusted local review URL을 반환함을 확인했다.
- 정적 검증:
  - `git diff --check`
  - 금지 패턴 검색: `any`, `as unknown`, `as any`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, `enum`, TODO/FIXME 없음 in changed TS files.
  - pure LOC: `src/cli/index.ts` 933 → 943 after helper call wiring, `src/cli/share-upload-execution.ts` 115, `tests/share-upload-execution.test.ts` 159, `tests/cli-handoff-policy.test.ts` 40.
- LSP: `typescript-language-server` 미설치로 MCP LSP diagnostics 실행 불가.

## 배포/인프라

- 서버 배포, 개인서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 새 기능 추가 없음. 기존 `agentfeed share` upload execution ownership만 분리했다.

## 다음 후보

- `src/cli/index.ts`가 아직 943 pure LOC이므로 다음 safe slice에서 command orchestration 경계를 계속 줄인다.
- 후보: `share` collection/preview orchestration 잔여 경계 또는 auth/login execution helper 축소.
