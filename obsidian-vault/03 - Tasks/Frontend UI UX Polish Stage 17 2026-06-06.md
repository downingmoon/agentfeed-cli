---
title: Frontend UI UX Polish Stage 17 2026-06-06
date: 2026-06-06
tags:
  - agentfeed/frontend
  - agentfeed/ui-ux
  - agentfeed/evidence
status: completed
stage: 17
---

# Frontend UI UX Polish Stage 17 2026-06-06

## Scope

Cross-page visual/DOM QA로 public/auth/error/loading surface를 다시 훑고, Stage 10~16 이후 남은 상용화 품질 결함을 정리했다.

검증 대상 route는 desktop `1440x1000`, mobile `390x844` 두 viewport에서 다음 14개였다.

- `/`
- `/feed`
- `/explore`
- `/leaderboard`
- `/search`
- `/search?q=stage17&type=worklogs`
- `/projects`
- `/profile/stage17`
- `/projects/stage17/smoke-project`
- `/cli/authorize`
- `/settings`
- `/dashboard`
- `/notifications`
- `/does-not-exist-stage17`

## Findings

> [!bug] Landmark 누락
> Stage 17 cross-page QA에서 `/explore`, `/leaderboard`, `/projects`가 visible `h1`은 갖고 있었지만 page-level `main` landmark가 없었다. desktop/mobile 양쪽에서 동일하게 발견됐다.

> [!bug] Production start regression
> `next@15.5.18` 상태에서 production `next start`가 `routesManifest.dataRoutes is not iterable`로 실패했다. 개인 서버 compose의 production 경로도 `npm run build && npm run start`를 사용하므로 단순 QA 이슈가 아니라 실제 배포 품질 결함이다.

## Changes

- `ExplorePage` loaded state와 skeleton root를 `main` landmark로 교체했다.
- `LeaderboardPage` page shell root를 `main` landmark로 교체했다.
- `ProjectsPage` page shell root를 `main` landmark로 교체했다.
- `page-source-contract.test.ts`에 위 세 페이지의 `main` landmark 계약을 추가했다.
- `next`를 보안 패치가 적용된 `15.5.19`로 고정했다.
  - `15.3.2`, `15.5.7`, `15.5.9`는 각각 npm/Next.js 보안 권고 또는 `npm audit` 기준으로 유지하지 않았다.
  - 참고: [Next.js CVE-2025-66478 advisory](https://nextjs.org/blog/CVE-2025-66478), [Next.js Security Update 2025-12-11](https://nextjs.org/blog/security-update-2025-12-11).

## Verification evidence

- `npm test`: passed.
- `npm run lint`: passed.
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build`: passed on `next@15.5.19`.
- `.next/routes-manifest.json` sanity: `dataRoutes`, `dynamicRoutes`, `staticRoutes` are arrays.
- `npm audit --omit=dev --audit-level=high`: passed, `found 0 vulnerabilities`.
- `git diff --check`: passed.
- Production server smoke:
  - `PORT=3112 ... npm run start`: server became ready.
  - `curl -fsS http://localhost:3112/explore`: ready, SSR HTML contained `main`.
- Stage 17 Playwright production visual/DOM QA:
  - 28 checks: 14 routes × 2 viewports.
  - Result: `pass: true`, `failures: []`.
  - Assertion scope: no navigation failure, no horizontal overflow, no crash text, at least one `main` landmark.
- Representative product screenshots were visually inspected:
  - desktop `/explore`
  - mobile `/projects`
  - Production localhost intentionally showed API safety warning because production runtime must not point at `localhost`; layout remained stable.

## Cleanup

- Broken dev server on port `3112` was stopped.
- Production `next start` verification server on port `3112` was stopped.
- Temporary Playwright evidence was summarized in this note and removed from `/tmp` after documentation.
- No residual `next`, `playwright`, or Chromium verification processes should remain after the cleanup check.

## Remaining before goal completion

> [!todo]
> The broader Frontend UI/UX goal is still not complete. Authenticated live success-state flows still need visual smoke evidence, especially CLI OAuth approval, profile follow, project create/edit/delete, settings token lifecycle, and worklog publish/review success paths against a running API/frontend pair.
