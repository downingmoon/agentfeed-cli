---
title: Personal Server Deploy 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/deploy
  - agentfeed/frontend
status: done
aliases:
  - 2026-06-10 Personal Server Deploy
---

# Personal Server Deploy 2026-06-10

> [!success]
> 개인서버 `161.33.171.81`에 AgentFeed 최신 소스를 1회 배포했다.

## 배포 범위

- [[AgentFeed Frontend]]: `main` commit `9dcb7b2` 반영
- [[AgentFeed Backend]]: 기존 `master` 최신 상태 유지
- [[AgentFeed CLI]]: 기존 `main` 최신 상태 유지
- [[AgentFeed Dev]]: 기존 배포 오케스트레이션으로 동기화 및 컨테이너 재기동

## 같이 반영된 프론트 수정

- `/cli/authorize`에서 브라우저 세션 마커가 없으면 `/auth/me`를 호출하지 않도록 변경했다.
- CLI 승인 페이지의 세션 저장/복구 로직과 표시 패널을 분리해 `CliAuthorizePage.tsx`를 250 pure LOC 이하로 낮췄다.
- 브라우저 세션 마커는 인증 수단이 아니라 비밀이 아닌 probe hint로만 유지한다.

## 검증

- Frontend
  - `npm run test:contracts` 통과
  - `npm run lint` 통과
  - `NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 NEXT_PUBLIC_REVIEW_BASE_URL=http://161.33.171.81:13030 ... npm run build` 통과
- Cross-repo
  - `node scripts/check-openapi-contract.mjs` 통과
  - `bash scripts/test-all.sh` 통과
    - CLI: 591 tests passed, release preflight passed, audit 0 vulnerabilities
    - Frontend CI: typecheck, audit, contract tests, mock API compatibility, production build 통과
    - Backend: 428 tests passed, 1 upstream Starlette/httpx deprecation warning
- Server deploy
  - `./scripts/server-deploy.sh --execute --up` 성공
  - backend: `0.0.0.0:18080->8000`, healthy
  - frontend: `0.0.0.0:13030->3000`, healthy
  - `http://161.33.171.81:18080/v1/metadata` returns `v1/2026-06-03`
  - `http://161.33.171.81:13030/cli/authorize` returns `HTTP/1.1 200 OK`
  - `http://161.33.171.81:13030/feed` returns `HTTP/1.1 200 OK`
- Browser surface
  - Playwright로 `http://161.33.171.81:13030/cli/authorize` 접속
  - 이번 로드의 API 네트워크 요청은 `/v1/metadata`만 확인
  - 새 콘솔 warning/error 없음

## 후속 확인

- [ ] 실제 GitHub OAuth 승인 플로우는 사용자의 브라우저 세션/계정 의도에 맞춰 수동 스모크 테스트한다.
- [ ] 공개 도메인/HTTPS 적용 전까지 개인서버는 IP + explicit insecure 설정으로만 테스트한다.
