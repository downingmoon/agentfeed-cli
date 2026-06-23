---
title: CLI Draft Collection Helpers Split 2026-06-23
aliases:
  - CLI Draft Collection Helpers Split
status: completed
tags:
  - agentfeed/cli
  - project/tasks
  - refactor
  - drafts
  - collection
created: 2026-06-23
updated: 2026-06-23
---

# CLI Draft Collection Helpers Split 2026-06-23

## 목적

CLI draft collection core가 fingerprint duplicate detection, upload-affecting policy hashing, agent source auto-detection까지 함께 보유해 `src/draft/create.ts`가 계속 oversized 상태였다. 신규 기능 없이 책임 경계를 분리해 draft collection path의 리뷰 가능성과 회귀 검증성을 높였다.

> [!success] 완료 판정
> `src/draft/create.ts`의 fingerprint/duplicate detection과 agent source auto-detection 책임을 전용 모듈로 분리했고, `create.ts`는 399 → 237 pure LOC로 250 LOC ceiling 아래로 내려갔다.

## 변경 내용

- `src/draft/collection-fingerprint.ts` 추가.
  - draft read failure warning compaction
  - duplicate draft lookup by `collection_fingerprint`
  - changed-file fingerprint normalization
  - redacted user note fingerprint input
  - project/collection policy fingerprint input
  - final collection fingerprint hashing
- `src/draft/agent-source-detection.ts` 추가.
  - enabled source ordering
  - local agent signal scoring
  - auto-detection failure warning composition
  - explicit session-file probe source expansion
- `src/draft/create.ts`는 collection orchestration만 유지하도록 import boundary를 좁혔다.

## LOC 결과

| 파일 | 이전 pure LOC | 이후 pure LOC |
| --- | ---: | ---: |
| `src/draft/create.ts` | 399 | 237 |
| `src/draft/collection-fingerprint.ts` | 없음 | 105 |
| `src/draft/agent-source-detection.ts` | 없음 | 72 |

## 검증

- LSP diagnostics
  - `src/draft/create.ts`: `Transport closed`
  - `src/draft/collection-fingerprint.ts`: `Transport closed`
  - `src/draft/agent-source-detection.ts`: `Transport closed`
  - 대체 검증: TypeScript typecheck, build, targeted/full tests, built CLI smoke
- `npm run typecheck`: passed
- `npm run build`: passed
- Targeted draft/session/fingerprint/configured-command suite: 22 files / 98 tests passed
- Full CLI suite: 226 files / 848 tests passed
- Built CLI smoke:
  - temp git repo 생성
  - `agentfeed init --project-name agentfeed-smoke-project --json`
  - `agentfeed collect --source other --json --force --no-save-cursor`
  - saved draft file 존재 및 output/saved draft id 일치 확인
- `git diff --check`: passed
- new module audit: comments, `any`, `@ts-ignore`, `@ts-expect-error`, `as any` 없음

## 커밋

- `f375494 Split draft collection helpers`

## 후행 과제

> [!todo]
> 서버/인프라/CI/CD 변경 및 배포는 하지 않았다. 활성 goal의 최신 제약인 서버 배포 금지를 유지한다.

- `src/collectors/agent-session.ts`는 여전히 1157 pure LOC로 가장 큰 다음 리팩터링 후보다.
- `src/config/credentials.ts`는 425 pure LOC로 추가 split 후보다.
- 이번 pass 후 `src/draft/create.ts`는 250 LOC 아래로 내려갔지만, collection orchestration 내부의 metrics/public-field assembly는 다음 품질 pass에서 더 작은 typed boundary로 나눌 수 있다.

## 관련 문서

- [[Active Tasks]]
- [[CLI Draft Session Aggregation Split 2026-06-23]]
- [[CLI Native Credential Keychain Split 2026-06-23]]
