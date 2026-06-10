---
title: Frontend Embedded IPv6 Private Host URL Guard 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - backend
  - api-contract
  - url-validation
  - host-safety
  - security
  - contract-mismatch
status: done
related:
  - "[[Frontend NAT64 Private Host URL Guard 2026-06-11]]"
  - "[[Frontend Settings Profile URL Contract Guard 2026-06-11]]"
---

# Frontend Embedded IPv6 Private Host URL Guard 2026-06-11

## 요약

Backend `validate_public_http_url()`은 IPv6에 embed된 private IPv4 우회 표현도 public URL로 보지 않는다.
직전 작업에서 NAT64는 맞췄지만, Frontend runtime/build-time URL safety는 아직 다음 edge case를 놓칠 수 있었다.

- 6to4 `2002::/16` 중 private IPv4가 embed된 host: 예 `2002:7f00:1::` → `127.0.0.1`
- Teredo `2001::/32` host: Backend `ipaddress` 기준 non-global로 거부

이번 작업은 신규 기능이 아니라 **Backend public URL policy와 Frontend runtime/build-time URL safety policy를 더 엄격히 맞춘 contract guard**다.

## 변경

- `agentfeed-frontend/src/lib/host-safety.ts`
  - 6to4 `2002::/16`의 embedded IPv4를 추출해 private/reserved/test/multicast range면 private/internal host로 판정
  - Teredo `2001:0000::/32` host를 private/internal host로 판정
- `agentfeed-frontend/scripts/check-env.mjs`
  - production build 환경검사에도 동일한 6to4/Teredo 차단 로직 반영
- `agentfeed-frontend/src/lib/api-url.contract.ts`
  - production API URL이 6to4 private embedded host와 Teredo host를 거부하는 contract case 추가
- `agentfeed-frontend/scripts/check-env.contract.test.mjs`
  - build-time `NEXT_PUBLIC_API_URL` 6to4/Teredo edge case 거부 테스트 추가

## 검증

Red 단계:

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts -- src/lib/api-url.contract.ts
node scripts/check-env.contract.test.mjs
```

결과:
- `api-url.contract.ts`: 6to4 private embedded host가 exception 없이 통과해 실패
- `check-env.contract.test.mjs`: build gate가 6to4 private embedded host를 통과시켜 실패

Green 이후:

```bash
npm run test:contracts -- src/lib/api-url.contract.ts
node scripts/check-env.contract.test.mjs
npm run lint
npm test
git diff --check
```

결과: 모두 통과.

추가 확인:

```bash
mcp_lsp.diagnostics src/lib/host-safety.ts
```

결과: `typescript-language-server` 미설치로 LSP 검증은 실행 불가. 대신 `tsc --noEmit`과 전체 contract test로 대체했다.

## 제약 / 남은 리스크

> [!warning]
> `scripts/check-env.mjs`와 `src/lib/host-safety.ts`가 URL host-safety 로직을 중복 보유한다. Next build 전 Node script라 TS module을 직접 가져오지 못해 현재는 중복을 유지했지만, 다음 정리 pass에서는 shared JS-safe module 또는 codegen 방식으로 drift를 줄이는 것이 좋다.

- 서버/인프라/CICD/배포 작업은 현재 goal 제약에 따라 수행하지 않았다.
