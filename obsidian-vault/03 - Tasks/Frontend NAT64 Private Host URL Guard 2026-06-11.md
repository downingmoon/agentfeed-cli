---
title: Frontend NAT64 Private Host URL Guard 2026-06-11
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
  - "[[Frontend Settings Profile URL Contract Guard 2026-06-11]]"
  - "[[Personal Server Deploy 2026-06-10]]"
---

# Frontend NAT64 Private Host URL Guard 2026-06-11

## 요약

Backend `validate_public_http_url()`은 NAT64 IPv6 주소에 private IPv4가 embed된 URL을 public URL로 보지 않고 거부한다.
Frontend `host-safety.ts`와 production build gate `scripts/check-env.mjs`는 기존 private IPv4/IPv6/suffix 검사는 했지만, `64:ff9b::/96` 및 `64:ff9b:1::/48` NAT64 prefix에 embed된 private IPv4를 놓칠 수 있었다.

이번 작업은 신규 기능이 아니라 **Backend public URL policy와 Frontend runtime/build-time URL safety policy를 맞춘 contract guard**다.

## 변경

- `agentfeed-frontend/src/lib/host-safety.ts`
  - IPv4 private range 판정을 `isPrivateIpv4Parts()`로 분리
  - compressed IPv6 segment expansion 추가
  - NAT64 well-known prefix `64:ff9b::/96`와 network-specific prefix `64:ff9b:1::/48`에서 마지막 32bit IPv4를 추출
  - embed된 IPv4가 private/reserved/test/multicast range이면 private/internal host로 판정
- `agentfeed-frontend/scripts/check-env.mjs`
  - production build 환경검사에도 동일한 NAT64 private-host 차단 로직 반영
- `agentfeed-frontend/src/lib/api-url.contract.ts`
  - production API URL이 legacy IPv4 표기와 NAT64 private-host를 거부하는 contract case 추가
- `agentfeed-frontend/scripts/check-env.contract.test.mjs`
  - build-time `NEXT_PUBLIC_API_URL=https://[64:ff9b::7f00:1]` 거부 case 추가

## 검증

Red 단계:

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts -- src/lib/api-url.contract.ts
node scripts/check-env.contract.test.mjs
```

결과:
- `api-url.contract.ts`: NAT64 private-host가 exception 없이 통과해 실패
- `check-env.contract.test.mjs`: build gate가 NAT64 private-host를 통과시켜 실패

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
> Backend Python `ipaddress`는 6to4, Teredo 등 더 넓은 IPv6 embedded-address globality도 검사한다. Frontend는 이번 작업에서 Backend test에 이미 고정된 NAT64 private-host mismatch를 우선 해소했다. 다음 URL safety pass에서는 6to4/Teredo edge case를 별도 contract fixture로 비교하는 것이 좋다.

- 서버/인프라/CICD/배포 작업은 현재 goal 제약에 따라 수행하지 않았다.
