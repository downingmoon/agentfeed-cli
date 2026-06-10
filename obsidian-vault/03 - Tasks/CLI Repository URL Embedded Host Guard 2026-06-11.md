---
title: CLI Repository URL Embedded Host Guard 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - backend
  - api-contract
  - privacy
  - repository-url
  - contract-mismatch
status: done
related:
  - "[[CLI API JSON Boundary Guard 2026-06-10]]"
  - "[[Backend Ingest Strict Contract 2026-06-08]]"
---

# CLI Repository URL Embedded Host Guard 2026-06-11

## 요약

Backend ingest `repository_url`은 public HTTP(S) URL만 허용한다. Frontend URL safety는 NAT64/6to4/Teredo처럼 private IPv4가 IPv6 안에 embedded 된 host도 차단하도록 보강되어 있었지만, CLI upload boundary는 userinfo 제거와 HTTP(S) 여부만 확인했다.

이번 작업은 신규 기능이 아니라 **CLI ingest payload의 `project.repository_url`을 Backend public URL policy에 맞춘 contract guard**다.

## 변경

- `src/privacy/host-safety.ts`
  - CLI용 host safety classifier 추가
  - 차단 범위:
    - private/internal IPv4
    - loopback/link-local/documentation/multicast/reserved IPv4
    - private/internal IPv6
    - NAT64 embedded private IPv4
    - 6to4 embedded private IPv4
    - Teredo host
    - `.localhost`, `.local`, `.internal`, `.lan`, `.home`, `.corp`, `.intranet`
- `src/privacy/url.ts`
  - 기존 `stripUrlUserInfo()`는 draft scan/redaction 경로가 private URL을 발견할 수 있도록 userinfo 제거 책임만 유지
  - 신규 `repositoryUrlForUpload()`가 upload boundary에서 Backend-private host를 `null`로 omit
  - 기존 broad `catch {}`를 `catch (error)` + `TypeError` narrowing으로 정리
- `src/api/client.ts`
  - ingest payload `project.repository_url` 생성 시 `repositoryUrlForUpload()` 사용
- `tests/privacy-url.test.ts`
  - NAT64/6to4/Teredo private-host repository URL이 upload 전에 `null`로 생략되는 red/green test 추가
  - public credentialed URL은 credential만 제거되고 유지되는 회귀 test 추가

## 검증

Red 단계:

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm test -- --run tests/privacy-url.test.ts
```

결과: NAT64/6to4/Teredo 3개 케이스가 기존 `stripUrlUserInfo()`에서 그대로 반환되어 실패.

Green 이후:

```bash
npm test -- --run tests/privacy-url.test.ts tests/api-hook.test.ts
npm run typecheck
npm run build
npm test -- --run
git diff --check
```

결과:

- focused + ingest 회귀 test: 136 passed
- 전체 test: 35 files / 610 tests passed
- typecheck/build/diff check 통과

추가 확인:

```bash
mcp_lsp.diagnostics src/privacy/url.ts
```

결과: `typescript-language-server` 미설치로 LSP 검증은 실행 불가. 대신 `npm run typecheck`와 전체 Vitest suite로 대체했다.

## 제약 / 남은 리스크

> [!warning]
> `src/api/client.ts`와 `tests/api-hook.test.ts`는 기존부터 250 pure LOC를 크게 넘는 oversized file이다. 이번 변경은 `src/api/client.ts`의 import/call-site 1곳만 바꿨고, 새 테스트는 `tests/api-hook.test.ts`에 추가하지 않고 작은 `tests/privacy-url.test.ts`로 분리했다. 향후 API client 작업 전에는 ingest/auth/metadata boundary로 파일 분리를 계획하는 것이 좋다.

- Backend validator 자체는 변경하지 않았다. 이번 변경은 이미 존재하는 Backend public URL contract를 CLI upload boundary에 반영한 것이다.
- draft 저장/scan 경로는 기존처럼 private URL을 `[REDACTED_URL]`로 보여줄 수 있게 유지했다. upload payload만 `null`로 omit한다.
- public prompt 같은 자유 텍스트 안의 NAT64/6to4/Teredo URL redaction 범위는 별도 privacy scanner 고도화 후보로 남긴다.
- 서버/인프라/CICD/배포 작업은 현재 goal 제약에 따라 수행하지 않았다.
