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
> CLI/API/Frontend/Dev의 로컬 통합, contract, smoke-e2e, CI 검증은 완료됐다. 지금 owner의 다음 방향은 **개인 서버에서 Frontend/Backend를 IP-only로 테스트 구동**하는 것이다. DNS/production domain/OAuth App/legal은 아직 별도 준비 단계로 남긴다.

> [!warning] 범위 구분
> 개인 서버 IP-only 테스트는 “내 서버에서도 3개 레포가 맞물려 돈다”를 확인하는 **server smoke/dev deployment**다. 현재 production/commercial readiness gate는 HTTPS public origin, production secret, proxy/host allowlist, OAuth live evidence를 요구하므로 IP-only HTTP 테스트와는 별도다.

## 2026-06-04 owner 결정 반영

- [x] 개발/테스트 배포는 우선 개인 서버에서 Frontend/Backend를 직접 구동한다.
- [x] 개발 단계에서는 별도 DNS 없이 IP로 접근한다.
- [x] GitHub OAuth App 설정은 추후 별도 질문/작업으로 미룬다.
- [x] env/secrets는 서버 OS/runtime/DB/port 구성이 잡힌 뒤 최종 값을 작성한다.
- [x] 법무/정책/운영 문구는 지금은 스킵하고 TODO로 남긴다.

## P0 — 개인 서버 IP-only 테스트 준비

### 1. 서버 기본 정보 확정

- [ ] 개인 서버 public IP 확인.
- [x] OS/architecture 확인.
  - 확인: Ubuntu Linux `aarch64`.
- [x] 구동 방식 결정.
  - 선택: `agentfeed-dev` Docker Compose 기반.
  - 대안: Backend/Frontend native + Postgres Docker.
- [x] 서버에서 이미 사용 중인 포트 확인.
  - 감지: `22`, `53`, `111`, `8080`, `8765`.
  - Docker: trading bot이 `8765` 사용 중.
- [x] AgentFeed 충돌 회피 포트 후보 생성.
  - Frontend: `13030`
  - Backend: `18080`
  - Postgres host port: `127.0.0.1:15432`
- [ ] 서버에 열 포트 결정/방화벽 반영.
  - 후보: Frontend `13030`, Backend `18080`; PostgreSQL은 외부 공개하지 않음.
- [ ] 방화벽/security group에서 필요한 포트만 허용.

### 2. IP-only endpoint 계획

개발 단계의 예시 값:

```bash
FRONTEND_URL=http://<SERVER_IP>:3000
NEXT_PUBLIC_API_URL=http://<SERVER_IP>:18080
AGENTFEED_API_BASE_URL=http://<SERVER_IP>:18080/v1
GITHUB_REDIRECT_URI=http://<SERVER_IP>:18080/v1/auth/github/callback  # OAuth 설정 시점에만 사용
```

- [ ] `<SERVER_IP>`를 실제 서버 IP로 치환한다.
- [ ] CLI가 바라볼 API base는 `/v1` 포함값으로 둔다.
- [ ] Frontend가 바라볼 API URL은 `/v1` 없이 Backend origin으로 둔다.
- [ ] IP-only 동안 `agentfeed.dev`는 계속 placeholder로만 취급한다.

> [!note]
> Frontend/Backend의 production fail-fast 규칙은 localhost/private/HTTP host를 일부 차단한다. 따라서 IP-only 테스트는 `production` 완전 배포가 아니라 dev/server smoke 환경으로 먼저 진행한다.

### 3. 서버 세팅 후 env/secrets 등록

질문 4번 답: **맞다. env/secrets는 서버 세팅이 먼저다.** 순서는 아래가 안전하다.

1. 서버 OS, Docker/Compose, Node/Python 등 기본 런타임 설치.
2. `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `AgentFeed-CLI` sibling layout 확인.
3. `agentfeed-dev make server-preflight`로 remote port scan과 `.env.server` 생성을 실행.
4. `make server-oauth`로 GitHub OAuth Client ID/Secret을 `.env.server`에 숨김 입력한다.
5. `make server-deploy-dry-run`으로 sync 계획 확인.
6. 필요하면 `make server-deploy`로 파일만 sync.
7. Postgres volume/backup 위치 결정.
8. 실제 시작은 별도 단계에서 `make server-up`.
9. CLI에서 `AGENTFEED_API_BASE_URL=http://<SERVER_IP>:18080/v1 agentfeed status` 등으로 smoke.

Backend 최소 env 후보:

- [ ] `DATABASE_URL`
- [ ] `SECRET_KEY`
- [ ] `ENVIRONMENT` — IP-only 테스트는 production보다 dev/staging 성격으로 시작.
- [ ] `PUBLIC_API_BASE_URL`
- [ ] `FRONTEND_URL`
- [ ] `ALLOWED_ORIGINS`
- [ ] `API_ALLOWED_HOSTS`
- [ ] `TRUSTED_PROXY_IPS` — reverse proxy를 붙일 때 확정.
- [ ] `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI` — OAuth를 진행할 때만.

Frontend 최소 env 후보:

- [ ] `NEXT_PUBLIC_API_URL=http://<SERVER_IP>:18080`
- [ ] 필요 시 `AGENTFEED_HOSTED_FRONTEND_URL=http://<SERVER_IP>:3000`

### 4. GitHub OAuth App 구성 — deferred

- [ ] GitHub OAuth App 생성 또는 기존 App 수정.
- [ ] Homepage URL을 실제 Frontend origin으로 설정.
- [ ] Authorization callback URL을 실제 Backend callback으로 설정.
  - 형식: `<BACKEND_API_ORIGIN>/v1/auth/github/callback`
- [ ] `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`을 Backend secret으로 등록.
- [ ] OAuth live smoke를 실행할 operator가 브라우저 로그인을 승인할 수 있는지 확인.

> [!todo]
> OAuth는 owner가 추후 다시 질문하면 IP-only/도메인/HTTPS 조건을 그 시점의 GitHub OAuth App 정책 기준으로 재확인하고 진행한다.

## P1 — npm 배포 정책 결정 상세

질문 5번 답: npm 배포는 **사용자가 `npm install -g agentfeed-cli` 또는 `npx agentfeed-cli`처럼 CLI를 쉽게 설치하게 하는 배포 채널**이다. 개인 서버에서 Frontend/Backend를 테스트 구동하는 것과는 별개라서 지금 당장 필수는 아니다.

### 현재 CLI package 상태

- Package name: `agentfeed-cli`
- Binary name: `agentfeed`
- Version: `0.2.0`
- Runtime: Node.js `>=20`
- Repository: `github.com/downingmoon/agentfeed-cli`
- Current metadata issue: `homepage`가 아직 `https://agentfeed.dev` placeholder다.
- Current license: `UNLICENSED`
- Current publish config: public access + provenance enabled

### owner가 결정해야 할 것

- [ ] package 이름을 확정한다.
  - unscoped: `agentfeed-cli`
  - scoped: `@<npm-user-or-org>/agentfeed-cli`
- [ ] npm 계정 또는 npm organization을 정한다.
- [ ] 공개 배포 여부를 정한다.
  - 공개 CLI 배포면 npm public package.
  - 내부 테스트만이면 local install/tarball/GitHub release로도 충분하다.
- [ ] license를 정한다.
  - `UNLICENSED` 유지 시 공개적으로 “사용권을 주지 않음”에 가깝다.
  - 오픈소스라면 MIT/Apache-2.0 등 SPDX license를 선택해야 한다.
  - proprietary 공개 배포라면 `SEE LICENSE IN LICENSE` + 별도 LICENSE 문서가 더 명확하다.
- [ ] `package.json.homepage`를 실제 landing/docs/GitHub URL로 변경할지 정한다.
- [ ] npm trusted publishing을 사용할지 정한다.

### npm trusted publishing 요약

공식 확인 기준:

- [npm unscoped public package](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages)
- [npm package scope/access/visibility](https://docs.npmjs.com/package-scope-access-level-and-visibility/)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/)
- [npm package.json license](https://docs.npmjs.com/files/package.json/)

요약:

- npm token을 GitHub Actions secret에 오래 보관하지 않고, GitHub Actions의 OIDC 신뢰관계로 publish하는 방식이다.
- npm package settings에서 GitHub owner/repo/workflow filename을 trusted publisher로 등록해야 한다.
- trusted publishing은 npm CLI `11.5.1+`, Node `22.14.0+`, GitHub-hosted runner 조건을 요구한다. 현재 package runtime은 Node `>=20`이지만 release CI는 별도로 Node 22.14+를 쓰는 게 안전하다.
- self-hosted runner는 현재 지원되지 않는다.
- GitHub Actions/GitLab CI에서 trusted publishing으로 public package를 publish하면 provenance가 자동 생성된다.
- 단, provenance 자동 생성은 public repository + public package 조건이 필요하다. 현재 GitHub repo가 private이면 provenance 표시는 제한될 수 있다.

### 지금 추천

- 개인 서버 IP-only 테스트가 끝날 때까지 npm public publish는 보류.
- 로컬 테스트는 repo checkout 또는 `npm link`/`npm install -g <path>`로 충분.
- 공개 배포 직전 아래만 다시 확정한다.
  1. npm package name/scope
  2. license 정책
  3. homepage/docs URL
  4. repo 공개/비공개 유지 여부
  5. trusted publishing workflow

## P2 — production domain/DNS/hosting/provider — deferred

- [ ] Production Frontend public origin 결정.
  - 예: `https://agentfeed.example.com` 또는 `https://app.example.com`
- [ ] Production Backend API origin 결정.
  - 예: `https://api.example.com`
- [ ] 도메인 구매 또는 기존 도메인 사용 권한 확보.
- [ ] DNS record 구성 권한 확보.
- [ ] Frontend hosting/provider 선택.
- [ ] Backend hosting/provider 선택.
- [ ] Production PostgreSQL 선택 및 생성.
- [ ] DB backup/restore 정책 결정.

> [!warning]
> `agentfeed.dev`는 현재 준비된 도메인이 아니다. 코드/테스트의 `agentfeed.dev` 값은 예시/계약 테스트용 placeholder로만 취급한다.

## P2 — 법무/정책/운영 문구 — skipped for now

- [ ] 개인정보 처리방침 초안 확정.
- [ ] 이용약관 초안 확정.
- [ ] 공개 feed moderation/report 처리 정책 확정.
- [ ] 사용자 데이터/토큰/세션 retention 정책 확정.
- [ ] public worklog에 표시 가능한 metric 범위 정책 확정.

## 사람이 결정하면 내가 이어서 할 수 있는 일

- [ ] 개인 서버 IP/OS/접속 방식 기준으로 서버용 `.env` 초안 작성.
- [ ] `agentfeed-dev` 기반 서버 구동 runbook 작성.
- [ ] 서버에서 `make setup`, `make up`, `make wait`, smoke 절차 실행/보정.
- [ ] IP-only server smoke evidence를 Obsidian에 반영.
- [ ] OAuth App 설정 시점에 callback/env/CLI login smoke 연결.
- [ ] production domain이 생기면 hosted readiness와 commercial readiness 재실행.
- [ ] npm 배포 정책이 확정되면 release/publish 절차 정리.

## 내가 다시 요청할 때 예시

```text
개인 서버 IP는 203.0.113.10이고 Ubuntu야. Docker Compose 기준으로 서버 구동 runbook이랑 .env 초안 만들어줘.
```

```text
OAuth App 설정할 차례야. IP-only 테스트 기준으로 GitHub OAuth callback과 env를 어떻게 넣을지 정리해줘.
```

```text
npm 배포는 package 이름 agentfeed-cli, license는 proprietary 유지로 갈게. release 문서와 publish 절차 정리해줘.
```

관련 문서: [[Active Tasks]], [[Runtime Configuration]], [[Integration - CLI Backend Frontend]], [[AgentFeed Current Product Brief]]
