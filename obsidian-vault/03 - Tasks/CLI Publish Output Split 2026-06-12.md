---
title: CLI Publish Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Publish Output Split 2026-06-12

> [!success] 완료
> `agentfeed publish`의 JSON payload 및 human upload result rendering을 `src/cli/publish-output.ts`로 분리했다. `cmdPublish`는 draft 선택, credential/preflight, upload, review URL handoff orchestration만 유지한다.

## 변경 범위

- `src/cli/publish-output.ts`
  - `publishJsonPayload`로 direct publish machine-readable payload 계약 고정.
  - `renderPublishUploadResultLines`로 direct publish human upload result 계약 고정.
  - privacy policy 및 upload next action 부착을 command entrypoint 밖으로 이동.
- `src/cli/index.ts`
  - direct publish JSON object literal 제거.
  - direct publish human result line 조립 제거.
  - upload/preflight/handoff side effect 흐름은 유지.
- `tests/publish-output.test.ts`
  - JSON payload의 `draft_id`, `upload`, `privacy_policy`, `handoff`, `next_actions` 계약 고정.
  - human output의 upload heading/message, review URL, next action rendering 계약 고정.

## 검증

- Red: `npm test -- --run tests/publish-output.test.ts`가 구현 전 `Cannot find module '../src/cli/publish-output.js'`로 실패.
- Red: human renderer 추가 전 `renderPublishUploadResultLines is not a function` 실패 확인.
- Build: `npm run build` 통과.
- Typecheck: `npm run typecheck` 통과.
- Focused tests: `npm test -- --run tests/publish-output.test.ts tests/cli-share.test.ts tests/upload-output.test.ts tests/share-output.test.ts` → 4 files / 62 tests 통과.
- Full regression: `npm test -- --run` → 93 files / 765 tests 통과.
- CLI smoke: temp git project + isolated HOME + local fake AgentFeed API에서 `share --dry --json`, `publish --id <draft> --json --yes --no-clipboard`, `publish --id <draft> --yes --no-clipboard --no-open-review` 실행. JSON payload, handoff suppression, cached human reused upload output 확인.
- Static: `git diff --check`, OMO TypeScript no-excuse checker 통과.
- LOC: `src/cli/index.ts` 1236 → 1229 pure LOC, `src/cli/publish-output.ts` 41 pure LOC.
- LSP: `typescript-language-server` 미설치/이전 declined 상태라 MCP LSP diagnostics 실행 불가.

## 효과

- Direct publish output 계약이 CLI orchestration에서 분리되어 CLI-Frontend-Backend contract drift 위험을 낮췄다.
- Publish command는 side effect sequencing을 유지하고, payload/line rendering은 focused helper가 담당한다.
- 신규 기능, 서버, infra, CI/CD, 배포 작업은 수행하지 않았다.

## 후속

> [!todo]
> `src/cli/index.ts`는 여전히 250 pure LOC 초과 inherited defect다. 다음 safe slice는 credential/config diagnostic formatting 또는 remaining command JSON payload처럼 observable CLI 계약을 red test로 고정할 수 있는 부분만 분리한다.
