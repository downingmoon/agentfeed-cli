---
title: CLI Publish Execution Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Publish Execution Split 2026-06-12

> [!success] 완료
> `agentfeed publish`의 confirmation gate, credential/token guidance, upload preflight, publish API call, saved-draft reread, review URL handoff policy를 `src/cli/publish-execution.ts`로 분리했다. JSON/human output rendering은 기존 `publish-output` / `upload-output` 경계에 유지했다.

## 변경 범위

- `src/cli/publish-execution.ts`
  - `runPublishCommand({ cwd, id, flags })`로 direct publish 실행 흐름을 분리했다.
  - `confirmation_required` / `published` discriminated union으로 upload 전 confirmation pause와 완료 결과를 명시했다.
  - JSON mode는 기존처럼 confirmation 없이 진행하며, `--clipboard` 명시 시에만 clipboard handoff를 요청하고 review auto-open config는 무시한다.
  - human mode는 기존처럼 clipboard 기본 handoff와 project config 기반 open policy를 유지한다.
  - upload 전 missing token guidance, compatibility/token preflight, API publish, saved draft reread, trust-aware handoff call 순서를 테스트 가능한 dependency seam으로 고정했다.
- `src/cli/index.ts`
  - inline `cmdPublish` 실행 로직을 제거하고 `runPublishCommand` 결과를 output helper로 렌더링한다.
- `tests/publish-execution.test.ts`
  - confirmation required 경로가 preflight/upload를 실행하지 않음을 고정했다.
  - JSON publish 경로가 metadata review base를 publish/handoff에 전달하고 config-independent open policy를 사용함을 고정했다.
  - missing credentials가 preflight 전 login guidance로 실패함을 고정했다.
- `tests/cli-handoff-policy.test.ts`
  - publish 실행이 helper로 이동된 뒤에도 모든 upload handoff call이 active API base와 review base를 넘기는지 `src/cli/index.ts` + `src/cli/publish-execution.ts` 전체로 검사한다.

## 검증

- Red test 확인: `npm test -- --run tests/publish-execution.test.ts` → `src/cli/publish-execution.js` 모듈 부재로 실패.
- Green/focused:
  - `npm test -- --run tests/publish-execution.test.ts` → 1 file / 3 tests passed.
  - `npm run typecheck`
  - `npm run build`
  - `npm test -- --run tests/publish-execution.test.ts tests/publish-output.test.ts tests/upload-output.test.ts tests/upload-preflight.test.ts tests/review-handoff.test.ts tests/runtime-policy.test.ts tests/cli-share.test.ts tests/cli-handoff-policy.test.ts` → 8 files / 80 tests passed.
- Full suite: `npm test -- --run` → 104 files / 813 tests passed.
- 실제 CLI smoke:
  - temp project + local fake AgentFeed API로 `agentfeed publish --id draft_publish_smoke` confirmation pause를 확인했다.
  - confirmation pause 중 metadata/token/ingest network call count가 모두 0임을 확인했다.
  - `agentfeed publish --id draft_publish_smoke --yes --json --no-clipboard --no-open-review`가 fake metadata/token/ingest를 각각 1회 호출하고 parseable JSON upload payload, privacy policy, disabled handoff, next actions를 반환함을 확인했다.
- 정적 검증:
  - `git diff --check`
  - no-excuse TypeScript checker: no violations in `src/cli/publish-execution.ts`, `tests/publish-execution.test.ts`, `tests/cli-handoff-policy.test.ts`.
  - pure LOC: `src/cli/index.ts` 939 → 933, `src/cli/publish-execution.ts` 103, `tests/publish-execution.test.ts` 141.
- LSP: `typescript-language-server` 미설치로 MCP LSP diagnostics 실행 불가.

## 배포/인프라

- 서버 배포, 개인서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 새 기능 추가 없음. 기존 `agentfeed publish` execution ownership만 분리했다.

## 다음 후보

- `src/cli/index.ts`가 아직 933 pure LOC이므로 다음 safe slice에서 command orchestration 경계를 계속 줄인다.
- 후보: share upload execution 잔여 경계 분리 또는 status/doctor orchestration 잔여 boundary 축소.
