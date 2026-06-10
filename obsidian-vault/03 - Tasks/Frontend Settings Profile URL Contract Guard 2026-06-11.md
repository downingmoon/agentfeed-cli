---
title: Frontend Settings Profile URL Contract Guard 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - backend
  - api-contract
  - settings
  - profile
  - url-validation
  - contract-mismatch
status: done
related:
  - "[[Frontend Settings Profile Text Bounds Guard 2026-06-11]]"
  - "[[Frontend Settings Timezone Profile Contract Guard 2026-06-11]]"
---

# Frontend Settings Profile URL Contract Guard 2026-06-11

## 요약

Backend `UpdateProfileRequest`는 profile URL 필드에 public HTTP(S) URL contract를 적용한다.
- `website_url`: public `http`/`https`, credentials 금지, localhost/private/internal host 금지
- `github_url`: 위 조건 + `github.com` / `www.github.com` host만 허용
- `x_url`: 위 조건 + `x.com` / `www.x.com` / `twitter.com` / `www.twitter.com` host만 허용

Frontend settings save helper는 URL을 그대로 mutation body에 보낼 수 있어 Backend 422에 뒤늦게 의존했다.
이번 작업은 신규 기능이 아니라 **이미 존재하는 Backend URL request contract를 Frontend form boundary에 맞춘 것**이다.

## 변경

- `agentfeed-frontend/src/lib/settings-profile-save.ts`
  - `isPrivateOrInternalHost()`를 사용해 profile URL host를 mutation 전에 검증
  - URL contract 위반 시 `status: 'invalid'`로 반환하고 profile mutation을 호출하지 않음
  - invalid 메시지 예:
    - `Website URL must use http or https.`
    - `Website URL host must be public.`
    - `GitHub URL host must be github.com.`
- `agentfeed-frontend/src/lib/settings-profile-save.contract-fixtures.ts`
  - settings profile contract tests 공용 fixture 분리
- `agentfeed-frontend/src/lib/settings-profile-save.contract.test.ts`
  - 243 LOC warning band였던 파일을 169 LOC로 축소
- `agentfeed-frontend/src/lib/settings-profile-validation.contract.test.ts`
  - profile text bounds test를 분리
  - backend가 거부할 URL 입력이 API 호출 없이 invalid로 실패하는 contract test 추가
- `agentfeed-frontend/scripts/run-contract-tests.mjs`
  - 새 `settings-profile-validation.contract.test.ts`를 compile/run 목록에 추가

## 검증

Red 단계:

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts -- src/lib/settings-profile-save.contract.test.ts src/lib/settings-profile-validation.contract.test.ts
```

결과: 기존 helper가 `websiteUrl=javascript:alert(1)`을 profile mutation까지 진행하려 해 실패.

Green 이후:

```bash
npm run test:contracts -- src/lib/settings-profile-save.contract.test.ts src/lib/settings-profile-validation.contract.test.ts
npm run lint
npm test
git diff --check
```

결과: 모두 통과.

추가 확인:

```bash
mcp_lsp.diagnostics src/lib/settings-profile-save.ts
```

결과: `typescript-language-server` 미설치로 LSP 검증은 실행 불가. 대신 `tsc --noEmit`과 전체 contract test로 대체했다.

## 제약 / 남은 리스크

> [!warning]
> Frontend URL validation은 Backend의 public URL contract를 form boundary에서 동일 취지로 반영한다. Backend의 Python `ipaddress`가 커버하는 특수 IPv6/NAT64/legacy literal 케이스와 완전한 byte-for-byte 동등성은 별도 shared contract fixture가 필요하다.

- 서버/인프라/CICD/배포 작업은 현재 goal 제약에 따라 수행하지 않았다.
