---
title: AgentFeed Current Product Brief
aliases:
  - AgentFeed Current State
  - Current Product Brief
status: active
tags:
  - agentfeed
  - product/current
updated: 2026-06-04
---

# AgentFeed Current Product Brief

## 한 줄 정의

AgentFeed는 Claude Code, Codex CLI, Gemini CLI, Cursor 등으로 수행한 개발 작업을 안전하게 수집해 **검토 가능한 worklog**로 만들고, 사용자가 직접 게시해 portfolio/feed로 공유하는 서비스다.

## 현재 사용 흐름

```bash
agentfeed init
agentfeed login
agentfeed share --yes --open-review
```

- `login`: 브라우저 승인 기반 CLI token 발급. 기존 token은 stdin 입력 권장.
- `collect`: 로컬 draft 생성. 기본적으로 서버 업로드 없음.
- `share`: collect + preview + 명시 승인 후 private review 업로드.
- `publish`: 기존 draft/review worklog를 게시.
- `open`: 저장된 review URL 재오픈. trust policy 통과 URL만 허용.
- `doctor`: API, token, AI tool/plugin signal 진단.
- `scan`: local draft/path privacy scan.

## CLI

- Package: `agentfeed-cli`
- Version: `0.2.0`
- Runtime: Node.js `>=20`
- Package manager: `npm@11.6.0`
- Bin: `agentfeed`
- 주요 검증: `npm run build`, `npm test -- --run`, `npm run typecheck`, `npm run release:preflight`, `npm audit --audit-level=high`

> [!note]
> `package.json.homepage`는 production domain 준비 전까지 `https://github.com/downingmoon/agentfeed-cli#readme`를 가리킨다. `agentfeed.dev`는 실제 도메인 준비와 owner 승인 후에만 release metadata로 복귀한다.

## Backend

FastAPI 기반 API. 주요 영역:

- GitHub OAuth + CLI browser approval session
- ingestion token issue/rotate/revoke/status
- `/v1/ingest/worklogs` idempotent upload + durable quota
- worklog review/publish/unpublish/comment/report
- public feed/search/tags/explore/leaderboard
- projects/profile/dashboard/bookmarks/notifications/settings
- production config fail-fast, rate-limit, request id, audit trail, health/readiness

## Frontend

Next.js app. 주요 화면:

- `/` public landing
- `/feed`, `/explore`, `/search`, `/leaderboard`
- `/worklogs/[id]`, `/worklogs/[id]/review`
- `/projects`, `/projects/[owner]/[slug]`
- `/profile/[username]`
- `/dashboard`, `/settings`, `/notifications`, `/moderation/reports`
- `/cli/authorize`

일반 push CI는 code/contract/local build를 검증하고, hosted readiness는 수동 workflow에서 실제 URL을 입력받는다.

## Dev orchestration

`agentfeed-dev`는 3개 제품 레포를 sibling layout으로 묶어 로컬 실행과 cross-repo 검증을 제공한다.

```bash
make setup
make dev
make up
make wait
make test
make smoke-e2e
make smoke-hosted-compatibility
make commercial-readiness
```

## 현재 상용화 판정

- 로컬/소스/CI 하드닝은 완료 기준을 충족했다.
- 다음 실제 단계는 개인 서버에서 DNS 없이 IP-only로 Frontend/Backend server smoke를 수행하는 것이다.
- IP-only server smoke는 production/commercial readiness와 다르다.
- Hosted/commercial readiness는 owner가 도메인/OAuth/hosting/secrets를 결정하고 다음 값들이 설정된 뒤 실행해야 한다.
  - `AGENTFEED_HOSTED_API_BASE_URL`
  - `AGENTFEED_HOSTED_FRONTEND_URL`
  - OAuth live smoke용 GitHub OAuth app/secrets

관련: [[Runtime Configuration]], [[Active Tasks]], [[Human Action Checklist]]
