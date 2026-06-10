---
title: Frontend Settings Profile Text Bounds Guard 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - backend
  - api-contract
  - settings
  - profile
  - validation
  - contract-mismatch
status: done
related:
  - "[[Frontend Settings Timezone Profile Contract Guard 2026-06-11]]"
  - "[[CLI Ingest Draft Bounds Contract Guard 2026-06-11]]"
---

# Frontend Settings Profile Text Bounds Guard 2026-06-11

## 요약

Backend `UpdateProfileRequest`는 settings profile mutation에서 텍스트 필드 길이를 제한한다.
Frontend `saveSettingsProfile()`는 display name 필수값과 username 형식은 사전 검증했지만, `display_name`/`bio`/`location`/`timezone` max length는 API 호출 후 Backend 422에 의존했다.

이번 작업은 신규 기능이 아니라 **Backend settings profile request contract를 Frontend save boundary에 맞춘 것**이다.

## 변경

- `agentfeed-frontend/src/lib/settings-profile-save.ts`
  - Backend와 동일한 profile 텍스트 bounds 추가
    - display name: 100자
    - bio: 1000자
    - location: 100자
    - timezone: 50자
  - `saveSettingsProfile()`이 profile mutation 전에 위반을 `status: 'invalid'`로 반환
  - invalid 상태에서는 `updateProfile()` / `setUsername()` 호출이 발생하지 않도록 유지
- `agentfeed-frontend/src/lib/settings-profile-save.contract.test.ts`
  - 각 profile text bound 초과 케이스가 API 호출 없이 invalid로 실패하는 contract test 추가

## 검증

Red 단계:

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts -- src/lib/settings-profile-save.contract.test.ts
```

결과: 기존 frontend helper가 `displayName` 101자를 API까지 보내려 해 실패.

Green 이후:

```bash
npm run test:contracts -- src/lib/settings-profile-save.contract.test.ts
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
> `src/lib/settings-profile-save.contract.test.ts`는 243 LOC로 warning band다. 다음 settings profile contract test 추가 전에는 username/profile bounds 그룹을 별도 test file로 분리하는 것이 좋다.

- Backend schema 자체는 변경하지 않았다. 이번 변경은 이미 존재하는 Backend request contract를 Frontend boundary에 반영한 것이다.
- 서버/인프라/CICD/배포 작업은 현재 goal 제약에 따라 수행하지 않았다.
