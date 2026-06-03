---
title: Commercial Readiness Hardening - Review Path Proxy and Clipboard Fail Closed 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/security
status: completed
aliases:
  - Review path proxy and clipboard fail closed
---

# Review Path, Proxy Trust, and Clipboard Fail-Closed Hardening

> [!success]
> CLI, Frontend, Backend에서 외부 배포 없이 고칠 수 있는 production readiness drift 3건을 닫았다.

## 변경 요약

### CLI

- Trusted review URL path를 실제 Frontend route인 `/worklogs/<id>/review`로 제한했다.
- Legacy `/review/<id>` 형식은 더 이상 trusted upload/reopen URL로 인정하지 않는다.
- Upload response의 `id`와 review URL path의 worklog id가 일치해야만 local draft upload metadata로 저장한다.

### Frontend

- Explore page의 worklog card navigation이 `window.location.href` full reload 대신 `navigateToWorklogDetail(..., router.push)` helper를 사용한다.
- Worklog detail public prompt copy가 `navigator.clipboard.writeText` 성공을 `await`한 뒤에만 success 상태를 표시한다.
- Clipboard 거부/미지원 시 false “Copied”가 아니라 `Copy failed` status를 노출한다.

### Backend

- Production/staging settings에서 `TRUSTED_PROXY_IPS`가 빈 값이면 fail-fast 한다.
- `scripts/start-production.sh`도 `TRUSTED_PROXY_IPS`가 없으면 implicit `127.0.0.1` fallback 없이 종료한다.
- `deploy.env.example`와 README를 production proxy trust contract에 맞췄다.

## 검증 증거

```bash
# CLI
npm run build
npm run typecheck
npm test -- --run
npm run release:preflight

# Frontend
npm run test:contracts
npm run lint
NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build

# Backend
uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q
uv run --python 3.12 --locked --group dev pytest -q
```

- CLI: 23 files / 375 tests passed, release preflight passed
- Frontend: contract tests passed, TypeScript/lint passed, production build passed
- Backend: `tests/test_contracts.py` 329 passed, full backend 353 passed

## 남은 외부 blocker

- `api.agentfeed.dev` DNS가 아직 resolve되지 않는다.
- `https://agentfeed.dev/` hosted root가 여전히 `/login`으로 redirect된다.
- 따라서 Frontend push CI의 hosted-readiness 단계는 code gate 통과 후 계속 fail-closed 상태다.

## 관련 노트

- [[Commercial Readiness Hardening - Frontend Review Origin Navigation 2026-06-03]]
- [[Commercial Readiness Hardening - CLI Review Auto Open Override 2026-06-03]]
- [[Commercial Readiness Hardening - Backend Production Origin and Proxy Startup 2026-06-03]]
