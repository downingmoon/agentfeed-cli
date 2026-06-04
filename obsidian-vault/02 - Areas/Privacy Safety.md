---
title: Privacy Safety
aliases:
  - AgentFeed Privacy
  - Redaction Safety
status: active
tags:
  - agentfeed/privacy
  - security/privacy
updated: 2026-06-04
---

# Privacy Safety

## 원칙

- 공개 feed에 올라가는 내용은 사용자가 검토/게시한 내용이어야 한다.
- CLI는 public-safe summary를 만들고 private review를 먼저 생성한다.
- Backend는 publish 직전 fallback privacy scan을 수행한다.
- blocking finding이 있으면 publish가 차단된다.
- private notes, token, path, URL credential, provider token은 public payload에 노출하지 않는다.

## CLI privacy layer

- path redaction: home/user/credential path masking.
- URL redaction: credentials/query/hash/secrets 탐지.
- source/session evidence filtering.
- draft privacy scan dry-run.
- uploaded cache가 redacted payload drift를 숨기지 않도록 fail-closed.

## Backend privacy layer

- ingest payload caps.
- server fallback scanner.
- public/private/unlisted visibility gate.
- metric privacy settings.
- safe public preview contract.
- provider token non-retention.
- deleted user/project/worklog visibility suppression.

## Frontend privacy layer

- review page에서 privacy finding 확인 후 publish.
- private author note는 current auth guard 통과 시에만 노출.
- public adapter는 partial/malformed payload를 fail-closed 처리.
- share/clipboard/browser handoff 직전 URL trust 재검증.

## 공개 전 체크

- `agentfeed scan --id <draft_id> --dry-run`
- review page finding 확인
- publish 전 Backend fallback scan
- public feed/profile/project에서 private fields 부재 확인

관련: [[Collection System]], [[Integration - CLI Backend Frontend]]
