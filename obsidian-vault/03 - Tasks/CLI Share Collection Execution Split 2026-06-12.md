---
title: CLI Share Collection Execution Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Share Collection Execution Split 2026-06-12

> [!success] 완료
> `agentfeed share`의 project config validation, collection window resolution, dry-run credential skip, draft collection, draft sanitize/write, warning merge를 `src/cli/share-collection-execution.ts`로 분리했다. upload execution과 output rendering은 기존 `share-upload-execution` / `share-output` 경계에 유지했다.

## 변경 범위

- `src/cli/share-collection-execution.ts`
  - `runShareCollectionCommand({ cwd, args, share })`로 share 수집 준비 흐름을 분리했다.
  - dry-run은 기존처럼 upload credentials를 로드하지 않고, `skipConfiguredCommands`를 켠다.
  - upload 가능한 share는 credentials를 로드하고, `--force` / `--all`, session file, note, configured-command collection 옵션을 그대로 `collectDraftWithStatus`에 전달한다.
  - project config validation, collection window diagnostics, collection warnings, sanitized draft를 테스트 가능한 dependency seam으로 고정했다.
- `src/cli/index.ts`
  - inline `cmdShare` collection 준비 로직을 제거하고 helper 결과를 기존 JSON/human/share-upload 렌더링에 연결한다.
- `tests/share-collection-execution.test.ts`
  - dry-run share가 credentials를 로드하지 않고 cursor/collection warning을 병합하며 draft를 sanitize하는지 고정했다.
  - uploadable share가 credentials를 로드하고 force/run-command 옵션을 보존하는지 고정했다.

## 검증

- Red test 확인: `npm test -- --run tests/share-collection-execution.test.ts` → `src/cli/share-collection-execution.js` 모듈 부재로 실패.
- Green/focused:
  - `npm test -- --run tests/share-collection-execution.test.ts` → 1 file / 2 tests passed.
  - `npm run typecheck`
  - `npm run build`
  - `npm test -- --run tests/share-collection-execution.test.ts tests/share-upload-execution.test.ts tests/share-output.test.ts tests/cli-share.test.ts tests/duplicate-draft.test.ts tests/runtime-policy.test.ts` → 6 files / 79 tests passed.
- Full suite: `npm test -- --run` → 106 files / 818 tests passed.
- 실제 CLI smoke:
  - temp git project + local fake AgentFeed API로 `agentfeed share --source codex --session-file <file> --all` confirmation pause가 upload preflight/API 호출 없이 멈춤을 확인했다.
  - 같은 fake API에서 `agentfeed share --json --yes --source codex --session-file <file> --all --no-clipboard --no-open-review`가 metadata/token/ingest를 각각 1회 호출하고 trusted local review URL과 disabled handoff를 반환함을 확인했다.
  - 별도 temp git project에서 `agentfeed share --dry --json --all`이 invalid local API env를 호출하지 않고 dry-run JSON, `upload_skipped: null`, login/publish guidance를 반환함을 확인했다.
- 정적 검증:
  - `git diff --check`
  - 금지 패턴 검색: `any`, `as unknown`, `as any`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, `enum`, TODO/FIXME 없음 in changed TS files.
  - pure LOC: `src/cli/index.ts` 943 → 941, `src/cli/share-collection-execution.ts` 76, `tests/share-collection-execution.test.ts` 125.
- LSP: `typescript-language-server` 미설치로 MCP LSP diagnostics 실행 불가.

## 배포/인프라

- 사용자가 배포를 요청했지만, 활성 목표의 필수 규칙이 서버/개인서버 배포 및 infra/CICD 보류를 명시하므로 배포는 수행하지 않았다.
- 서버 배포, 개인서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 새 기능 추가 없음. 기존 `agentfeed share` collection execution ownership만 분리했다.

## 다음 후보

- `src/cli/index.ts`가 아직 941 pure LOC이므로 다음 safe slice에서 command orchestration 경계를 계속 줄인다.
- 후보: `collect --upload` 실행 경계 또는 auth/rotate execution helper 축소.
