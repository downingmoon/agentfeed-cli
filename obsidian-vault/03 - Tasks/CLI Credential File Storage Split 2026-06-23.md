---
title: CLI Credential File Storage Split 2026-06-23
aliases:
  - CLI Credential File Storage Split
status: completed
tags:
  - agentfeed/cli
  - project/tasks
  - refactor
  - credentials
  - keychain
created: 2026-06-23
updated: 2026-06-23
---

# CLI Credential File Storage Split 2026-06-23

## 목적

CLI credential boundary가 token resolution, API base protection, file persistence, stored credential normalization, keychain fallback/delete orchestration을 한 파일에 함께 보유해 `src/config/credentials.ts`가 계속 oversized 상태였다. 신규 기능 없이 저장소별 책임을 분리해 credential path의 리뷰 가능성과 회귀 검증성을 높였다.

> [!success] 완료 판정
> `src/config/credentials.ts`에서 credentials file I/O/normalization과 keychain/file store orchestration을 전용 모듈로 분리했다. Public import path는 유지했고 `credentials.ts`는 425 → 175 pure LOC로 내려갔다.

## 변경 내용

- `src/config/credentials-file.ts` 추가.
  - AgentFeed home/global dir/credentials path resolution
  - private `.agentfeed` directory and credentials file permission write
  - file/keychain metadata serialization
  - saved credentials JSON normalization and malformed-field warnings
- `src/config/credentials-store.ts` 추가.
  - credential store preference parsing
  - secure keychain-first save policy
  - explicit insecure fallback warning policy
  - keychain metadata delete/read orchestration
- `src/config/credentials.ts`는 public API wrapper와 token/API-base resolution 책임만 유지한다.
  - `resolveHomeDir`, `homeDir`, `globalAgentFeedDir`, `credentialsPath` public exports는 re-export로 유지한다.
  - `saveCredentials`, `deleteSavedCredentials`, `loadCredentialsWithMetadata` external behavior는 유지한다.

## LOC 결과

| 파일 | 이전 pure LOC | 이후 pure LOC |
| --- | ---: | ---: |
| `src/config/credentials.ts` | 425 | 175 |
| `src/config/credentials-file.ts` | 없음 | 144 |
| `src/config/credentials-store.ts` | 없음 | 137 |

## 검증

- LSP diagnostics
  - `src/config/credentials.ts`: `Transport closed`
  - `src/config/credentials-file.ts`: `Transport closed`
  - `src/config/credentials-store.ts`: `Transport closed`
  - 대체 검증: TypeScript typecheck, build, targeted/full tests, built CLI smoke
- `npm run typecheck`: passed
- `npm run build`: passed
- Targeted credential/keychain/logout/share suite: 11 files / 51 tests passed
- Full CLI suite: 226 files / 848 tests passed
- Built CLI smoke with local compatible `/v1/metadata` and `/v1/ingest/status` server:
  - auto keychain on headless Linux fail-closed
  - explicit `AGENTFEED_CREDENTIAL_STORE=file` `login --token-stdin --json`
  - `status --json` showed `account.token_configured=true` and `credential_store=file`
  - status output did not leak the ingestion token
- `git diff --check`: passed
- new module audit: comments, `any`, `@ts-ignore`, `@ts-expect-error`, `as any` 없음

## 커밋

- `b2a447a Split credential file storage`

## 후행 과제

> [!todo]
> 서버/인프라/CI/CD 변경 및 배포는 하지 않았다. 활성 goal의 최신 제약인 서버 배포 금지를 유지한다.

- `src/collectors/agent-session.ts`는 여전히 1157 pure LOC로 가장 큰 다음 리팩터링 후보다.
- `src/draft/session-aggregation.ts`는 213 pure LOC warning band다. 다음 edit에서 늘어날 경우 우선 split 후보로 본다.
- Credential credential path는 이제 size 기준으로 안정화됐지만, future pass에서는 `credentials.ts`의 API-base protection과 metadata resolution을 더 작은 typed boundary로 분리할 수 있다.

## 관련 문서

- [[Active Tasks]]
- [[CLI Native Credential Keychain Split 2026-06-23]]
- [[CLI Draft Collection Helpers Split 2026-06-23]]
