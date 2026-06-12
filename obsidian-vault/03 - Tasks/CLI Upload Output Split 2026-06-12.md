---
title: CLI Upload Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Upload Output Split 2026-06-12

> [!success] 완료
> `agentfeed share --yes` / `agentfeed publish`의 upload completion 및 confirmation human output line rendering을 `src/cli/upload-output.ts`로 분리했다. Command orchestration은 upload 여부, preflight, JSON payload, review URL handoff 수행만 유지한다.

## 변경 범위

- `src/cli/upload-output.ts`
  - upload complete/reused human output line renderer 추가.
  - upload confirmation-required human output line renderer 추가.
  - cached upload reuse warning 문구를 출력 helper 내부로 이동.
- `src/cli/index.ts`
  - upload 출력 조립 책임 제거.
  - `share` / `publish` command flow는 기존처럼 preflight, upload, handoff, JSON payload만 담당.
- `tests/upload-output.test.ts`
  - upload result summary, policy, review URL, next actions 출력 계약 고정.
  - confirmation gate, cache reuse warning, safe next command 출력 계약 고정.
- `tests/cli-handoff-policy.test.ts`
  - `printUploadResult` 제거 후에도 review URL trust-before-side-effect 정책을 새 command section 경계로 검사하도록 갱신.

## 검증

- Red test: `npx vitest run tests/upload-output.test.ts --reporter=verbose`가 구현 전 `Cannot find module '../src/cli/upload-output.js'`로 실패함을 확인.
- Build: `npm run build` 통과.
- Focused tests: `npx vitest run tests/upload-output.test.ts tests/cli-share.test.ts tests/api-hook.test.ts --reporter=verbose` → 3 files / 188 tests 통과.
- Policy regression: `npx vitest run tests/cli-handoff-policy.test.ts tests/upload-output.test.ts --reporter=verbose` → 2 files / 5 tests 통과.
- Full regression: `npm test -- --run` → 84 files / 732 tests 통과.
- CLI smoke: temp project + dist CLI `publish --id draft_smoke_upload_output` confirmed `AgentFeed upload paused`, `Upload confirmation required.`, `No data was uploaded to AgentFeed.`, preview command output. 서버 접속/배포 없이 confirmation gate까지만 검증.
- Static checks: `git diff --check`, strict banned-pattern grep, OMO TypeScript no-excuse checker 통과.
- LSP: `typescript-language-server` 미설치 및 이전 decline 상태로 MCP LSP diagnostics 실행 불가.

## 효과

- `src/cli/index.ts` pure LOC: 1777 → 1703.
- upload human output 변경 시 command orchestration, API preflight, JSON contract를 건드리지 않는 경계가 생겼다.
- CLI-Frontend-Backend upload 계약은 변경하지 않았다.

## 제한

- 서버/infra/CICD/deploy 작업 없음.
- 신규 기능 없음.
- 개인 서버 배포 없음.
