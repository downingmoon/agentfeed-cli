---
title: Active Tasks
aliases:
  - AgentFeed 다음 작업
  - CLI TODO Board
status: active
tags:
  - agentfeed/todo
  - project/tasks
updated: 2026-06-04
---

# Active Tasks

## 현재 결론

현재 goal은 **실제 hosted deployment/domain 검증을 제외**하고, 로컬/CI/contract/UI/UX 기준으로 CLI/API/Frontend/Dev를 상용화 가능한 품질까지 끌어올리는 것이다.

> [!success] 2026-06-04 로컬 상용화 품질 evidence
> - CLI `npm run release:preflight`: 통과, 397 tests passed.
> - Frontend local CI: `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run ci` 통과.
> - Backend `pytest`: 388 passed, `ruff check .` 통과, Alembic offline chain 001→027 생성 통과.
> - Dev `make test`: 통과.
> - Dev `make smoke-e2e`: 통과. CLI browser login/session approval → share upload → review API/page → privacy gate → publish → feed/dashboard/settings/sign-out DOM까지 검증.
> - 2026-06-04 추가 UI smoke: desktop/mobile landing/feed/worklog detail snapshot 확인. landing mobile overflow와 worklog detail mobile column collapse 수정 후 재확인.
> - 2026-06-04 추가 Profile/Project smoke: 임시 public profile/project/worklog fixture로 `/profile/downing`, `/projects/downing/smoke-project` 모바일 렌더링 확인 후 fixture 삭제. body/document horizontal overflow 없음.
> - 2026-06-04 추가 Backend regression: legacy string `outcome_json` public detail 500 수정. backend `pytest`: 388 passed.

> [!warning] 중요 정정
> `agentfeed.dev`는 아직 준비된 도메인이 아니다. 이번 goal의 완료 기준에는 실제 hosted deployment/domain 검증을 포함하지 않는다. 실제 도메인을 고른 뒤 별도 hosted readiness goal로 실행한다.

## P0 — 현재 goal: 로컬/CI/contract/UI 품질

- [x] CLI subcommand `--help`가 수집/상태파일 작성 side effect 없이 종료되도록 수정.
- [x] CLI 주요 명령 회귀: `release:preflight`로 `login`, `collect`, `share`, `publish`, `open`, `doctor`, `status` 관련 테스트 통과.
- [x] Frontend signed-out Header가 `/`와 `/feed`를 혼동하지 않도록 Home/Feed nav와 active state 수정.
- [x] Frontend landing/feed/review/profile/project 주요 grid가 모바일에서 고정폭 overflow를 만들지 않도록 responsive layout으로 수정.
- [x] Frontend list response wrapper가 `pagination` 누락/부분 payload에서도 fail-closed 동작하도록 정규화.
- [x] Dev smoke-e2e가 CLI auth `status_token` 계약과 backend browser `session_version` revocation 계약을 반영하도록 수정.
- [x] Dev smoke-e2e 실패 시 browser DOM 로그를 바로 출력하도록 보강.
- [x] Dev smoke-e2e 통과로 CLI/API/Frontend 핵심 end-to-end 흐름 검증.
- [x] Backend public worklog detail이 legacy string outcome rows도 현행 `OutcomeItem` response schema로 normalize하도록 수정.
- [x] Landing mobile `How it works`/`Privacy first` responsive overflow 수정.
- [x] Worklog detail mobile layout이 sidebar 때문에 main column을 0px로 collapse하지 않도록 수정.
- [x] `prefers-reduced-motion` 전역 대응 추가.
- [x] Profile tab strip이 모바일에서 clipping되어 보이지 않도록 wrap 처리.
- [x] Theme bootstrap nonce script의 hydration mismatch 경고를 억제.

## P1 — 이번 goal에서 남은 확인/정리

- [ ] 변경사항 커밋/푸시.
- [ ] Push 후 각 레포 CI 상태 확인.
- [x] Frontend 모바일/데스크톱 smoke screenshot으로 header/feed/landing/profile/project/worklog detail 시각 깨짐 여부 최종 확인.
- [x] 오래된 `docs/agentfeed_local_cli_mvp_implementation_spec_v0_2.md`와 backend `docs/fixes-required.md`가 현재 TODO로 오해되지 않도록 historical 문서로 표시.

## P2 — 별도 polish backlog

- [ ] Settings/Projects 편집 form의 label/id 연결을 더 촘촘하게 보강.
- [ ] Project tabs의 `aria-controls`/tabpanel 연결까지 보강.

## Parking lot — 실제 배포/상용 readiness

아래 항목은 중요하지만, 사용자가 이번 goal에서 **실제 배포 검증은 제외**한다고 명확히 정정했다.

- [ ] 실제 Frontend domain 결정.
- [ ] 실제 Backend API domain 결정.
- [ ] Backend production/staging env 구성:
  - `DATABASE_URL` TLS
  - `SECRET_KEY`
  - `FRONTEND_URL`
  - `ALLOWED_ORIGINS`
  - `API_ALLOWED_HOSTS`
  - `TRUSTED_PROXY_IPS`
  - GitHub OAuth env
- [ ] Frontend deployment env 구성:
  - `NEXT_PUBLIC_API_URL`
  - optional `AGENTFEED_HOSTED_FRONTEND_URL`
- [ ] GitHub OAuth App callback을 실제 Backend callback URL로 설정.
- [ ] `make smoke-hosted-compatibility`를 실제 URL로 통과.
- [ ] `make smoke-oauth-live`를 operator 승인으로 통과.
- [ ] `make commercial-readiness`가 `COMMERCIAL_READINESS_PASSED` 출력.

## P1 — Public release 준비

- [ ] CLI `package.json.homepage`가 실제 domain 또는 GitHub/docs URL을 가리키도록 정리.
- [ ] `license: UNLICENSED` 유지 여부 결정. public npm 배포 전 정책 확정.
- [ ] npm package 이름/README/install command 최종 확인.
- [ ] Frontend landing copy의 `agentfeed preview --remote` 같은 현재 없는/혼동 가능한 명령어 문구 점검.
- [ ] Backend integration guide의 예시 command가 현재 CLI 명령과 일치하는지 점검.

## P2 — 운영/문서 품질

- [x] Obsidian 완료 작업 로그 rollup 및 노이즈 제거.
- [ ] 실제 배포 후 [[Runtime Configuration]]에 production URL/환경 예시 추가.
- [ ] commercial readiness evidence artifact 위치와 재실행 절차를 운영 runbook으로 분리.
- [ ] 사용자용 quick-start 문서와 개발자용 runbook 분리.

## 완료 요약

완료된 대량 hardening 항목은 [[Commercial Readiness Completed Summary 2026-06-04]]에 통합했다.
