---
title: Human Action Checklist
aliases:
  - 사람이 직접 해야 할 일
  - Owner Handoff Checklist
status: active
tags:
  - agentfeed/handoff
  - agentfeed/todo
  - project/human-action
updated: 2026-06-04
---

# Human Action Checklist

이 문서는 AgentFeed가 로컬/CI/contract/UI/UX 기준으로 준비된 뒤, **사람이 직접 결정하거나 계정 권한으로 수행해야 하는 일**만 모은 handoff 문서다.

> [!success] 현재 자동화/개발 완료 상태
> CLI/API/Frontend/Dev의 로컬 통합, contract, smoke-e2e, CI 검증은 완료됐다. 실제 hosted domain/deployment 검증은 아직 범위 밖이며, 아래 항목들이 끝난 뒤 별도 hosted readiness goal로 진행한다.

## P0 — 출시 전 반드시 사람이 결정/처리할 일

### 1. Production 도메인 결정

- [ ] Frontend public origin 결정.
  - 예: `https://agentfeed.example.com` 또는 `https://app.example.com`
- [ ] Backend API origin 결정.
  - 예: `https://api.example.com`
- [ ] root domain을 landing으로 쓸지, app subdomain을 쓸지 결정.
- [ ] 결정한 도메인을 [[Runtime Configuration]]의 hosted 예시에 반영하도록 요청.

> [!warning]
> `agentfeed.dev`는 현재 준비된 도메인이 아니다. 코드/테스트의 `agentfeed.dev` 값은 예시/계약 테스트용 placeholder로만 취급한다.

### 2. DNS/hosting/provider 선택

- [ ] 도메인 구매 또는 기존 도메인 사용 권한 확보.
- [ ] DNS record 구성 권한 확보.
- [ ] Frontend hosting 선택 및 프로젝트 생성.
  - 예: Vercel, Cloudflare Pages, Netlify 등.
- [ ] Backend hosting 선택 및 프로젝트 생성.
  - 예: Fly.io, Render, Railway, AWS/GCP 등.
- [ ] Production PostgreSQL 선택 및 생성.
- [ ] DB backup/restore 정책 결정.

### 3. GitHub OAuth App 구성

- [ ] GitHub OAuth App 생성 또는 기존 App 수정.
- [ ] Homepage URL을 실제 Frontend origin으로 설정.
- [ ] Authorization callback URL을 실제 Backend callback으로 설정.
  - 형식: `<BACKEND_API_ORIGIN>/v1/auth/github/callback`
- [ ] `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`을 Backend hosting secret으로 등록.
- [ ] OAuth live smoke를 실행할 operator가 브라우저 로그인을 승인할 수 있는지 확인.

### 4. Production environment secrets 등록

Backend hosting에 최소 아래 값을 등록해야 한다.

- [ ] `DATABASE_URL` — production PostgreSQL, TLS 포함.
- [ ] `SECRET_KEY` — 충분히 긴 production secret.
- [ ] `ENVIRONMENT=production` 또는 `staging`.
- [ ] `PUBLIC_API_BASE_URL` — 실제 Backend public origin/API base 정책에 맞게 설정.
- [ ] `FRONTEND_URL` — 실제 Frontend origin.
- [ ] `ALLOWED_ORIGINS` — Frontend origin 목록.
- [ ] `API_ALLOWED_HOSTS` — Backend host allowlist.
- [ ] `TRUSTED_PROXY_IPS` — hosting/proxy topology에 맞게 설정.
- [ ] `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`.

Frontend hosting에 최소 아래 값을 등록해야 한다.

- [ ] `NEXT_PUBLIC_API_URL` — Backend origin, trailing `/v1` 없이.
- [ ] 필요 시 `AGENTFEED_HOSTED_FRONTEND_URL` — hosted smoke용 명시 URL.

### 5. npm 배포 정책 결정

- [ ] npm package 이름을 최종 확정.
  - 현재 package: `agentfeed-cli`, binary: `agentfeed`.
- [ ] npm 배포 계정/organization 결정.
- [ ] `license: UNLICENSED` 유지 여부 결정.
  - 공개 npm 배포 전 라이선스 정책은 owner가 확정해야 한다.
- [ ] `package.json.homepage`를 실제 도메인 또는 GitHub/docs URL로 바꿀지 결정.
- [ ] npm trusted publishing 설정.
- [ ] Release workflow가 실제 npm package publish 권한을 갖는지 확인.

### 6. 법무/정책/운영 문구 결정

- [ ] 개인정보 처리방침 초안 확정.
- [ ] 이용약관 초안 확정.
- [ ] 공개 feed moderation/report 처리 정책 확정.
- [ ] 사용자 데이터/토큰/세션 retention 정책 확정.
- [ ] public worklog에 표시 가능한 metric 범위 정책 확정.

## P1 — 사람이 승인하면 내가 이어서 할 수 있는 일

아래는 사람의 결정/계정 작업 후, 다시 agent에게 맡기면 되는 작업이다.

- [ ] 결정된 production URL 기준으로 CLI/Backend/Frontend 문서와 metadata 정리.
- [ ] Frontend/Backend deployment env sanity check.
- [ ] `make smoke-hosted-compatibility` 실행.
- [ ] `make smoke-oauth-live` 실행.
- [ ] `make commercial-readiness` 실행.
- [ ] hosted evidence artifact를 Obsidian/README에 반영.
- [ ] npm release preflight 재확인 및 publish 절차 실행 준비.

## P2 — 제품 polish backlog

- [ ] Settings/Projects edit form의 `label`/`id` 연결 강화.
- [ ] Project/Profile tab의 `aria-controls`/`tabpanel` 연결 강화.
- [ ] public quick-start와 developer runbook을 별도 문서로 분리.
- [ ] production incident/runbook 문서 추가.

## 내가 다시 요청할 때 예시

```text
도메인은 Frontend=https://..., API=https://... 로 정했어.
이 기준으로 hosted readiness 준비하고 smoke 실행해줘.
```

```text
npm 배포는 package 이름 agentfeed-cli, license는 proprietary 유지로 갈게.
release 문서와 publish 절차 정리해줘.
```

관련 문서: [[Active Tasks]], [[Runtime Configuration]], [[Integration - CLI Backend Frontend]], [[AgentFeed Current Product Brief]]
