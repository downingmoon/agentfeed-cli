---
title: CLI Native Credential Keychain Split 2026-06-23
aliases:
  - CLI native credential keychain split
  - Native credential keychain split
tags:
  - agentfeed/cli
  - project/tasks
  - refactor
  - credentials
  - keychain
status: done
created: 2026-06-23
updated: 2026-06-23
code_commit: 36fe9605d246693347fa4e7c42aa689bd44f31bd
---

# CLI Native Credential Keychain Split 2026-06-23

## Summary

CLI credentials module에서 native OS keychain subprocess/platform implementation을 `src/config/credentials-keychain.ts`로 분리했다. `src/config/credentials.ts`는 credential persistence/resolution orchestration을 유지하고, 기존 public credential API와 `SecretStore` export는 유지했다.

## Code changes

- `src/config/credentials.ts`
  - native keychain subprocess/platform helpers 제거.
  - `nativeKeychainStore(metadata)`가 `createNativeKeychainStore(globalAgentFeedDir(), metadata)`를 호출하도록 축소.
  - pure LOC: 603 → 425.
- `src/config/credentials-keychain.ts`
  - macOS `security`, Linux `secret-tool`, Windows DPAPI PowerShell store 생성 로직을 소유.
  - `createNativeKeychainStore(agentFeedDir, metadata)` 신규 export.
  - pure LOC: 184.

## Verification

> [!success]
> Code commit `36fe9605d246693347fa4e7c42aa689bd44f31bd` 검증 완료.

- LSP diagnostics: `src/config/credentials.ts`, `src/config/credentials-keychain.ts` 모두 `Transport closed`로 실패. 기존 LSP runtime gap으로 기록하고 대체 검증 수행.
- `npm run build`: pass.
- `npm run typecheck`: pass.
- Targeted credential/keychain suite: 11 files / 50 tests pass.
- Full CLI suite: 226 files / 848 tests pass.
- `git diff --check`: pass.
- New file audit: `src/config/credentials-keychain.ts`에서 comment/no-any/no-ts-ignore/no-ts-expect-error grep clean.
- Manual built CLI smoke:
  - Temporary local compatible `/v1/metadata` + `/v1/ingest/status` server.
  - Auto keychain path on headless Linux: `OS keychain credential storage` fail-closed, no credentials file persisted.
  - Explicit `AGENTFEED_CREDENTIAL_STORE=file`: `login --token-stdin --json` + `status --json` roundtrip pass, token not leaked to stdout/stderr.

## Boundaries

- 신규 앱 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- push/deploy 없음.
- Public import/behavior contract 유지.

## Remaining follow-up candidates

- `src/collectors/agent-session.ts`: 1157 pure LOC.
- `src/draft/create.ts`: 607 pure LOC.
- `src/config/credentials.ts`: 425 pure LOC, 추가 responsibility split 후보.
