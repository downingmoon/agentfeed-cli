---
title: Active Tasks
aliases:
  - AgentFeed 다음 작업
  - CLI TODO Board
status: active
tags:
  - agentfeed/todo
  - project/tasks
updated: 2026-06-05
---

# Active Tasks

## 현재 결론

로컬/CI/contract/UI/UX 기준 상용화 품질 goal은 **완료**됐다. owner가 새로 정한 다음 방향은 **개인 서버에서 Frontend/Backend를 IP-only로 테스트 구동**하는 것이다.

- 사람이 직접 해야 할 일: [[Human Action Checklist]]
- 서버/env 기준: [[Runtime Configuration]]
- 완료된 대량 hardening 요약: [[Commercial Readiness Completed Summary 2026-06-04]]

> [!success] 2026-06-04 로컬 상용화 품질 evidence
> - CLI `npm run release:preflight`: 통과, 397 tests passed.
> - Frontend local CI: `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run ci` 통과.
> - Backend `pytest`: 388 passed, `ruff check .` 통과, Alembic offline chain 001→027 생성 통과.
> - Dev `make test`: 통과.
> - Dev `make smoke-e2e`: 통과. CLI browser login/session approval → share upload → review API/page → privacy gate → publish → feed/dashboard/settings/sign-out DOM까지 검증.
> - 2026-06-04 추가 UI smoke: desktop/mobile landing/feed/worklog detail snapshot 확인. landing mobile overflow와 worklog detail mobile column collapse 수정 후 재확인.
> - 2026-06-04 추가 Profile/Project smoke: 임시 public profile/project/worklog fixture로 `/profile/downing`, `/projects/downing/smoke-project` 모바일 렌더링 확인 후 fixture 삭제. body/document horizontal overflow 없음.
> - 2026-06-04 추가 Backend regression: legacy string `outcome_json` public detail 500 수정. backend `pytest`: 388 passed.
> - 2026-06-04 push/CI: CLI `9361948`, Backend `286c981`, Frontend `2ec2455`, Dev `8db795e` 푸시 완료. 이후 Obsidian evidence doc commit `45b6ee1`도 푸시/CI 성공.

> [!warning] 도메인 상태
> `agentfeed.dev`는 아직 준비된 도메인이 아니다. 현재 문서/코드의 `agentfeed.dev` 값은 예시 또는 계약 테스트용 placeholder로만 취급한다. 개발 단계에서는 DNS 없이 개인 서버 IP로 테스트한다.

## 완료됨 — 로컬/CI/contract/UI 품질

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
- [x] 오래된 `docs/todo/*`와 backend `docs/fixes-required.md`가 현재 TODO로 오해되지 않도록 historical 문서로 표시.
- [x] 개발/테스트 배포 방향을 개인 서버 IP-only로 확정하고 Obsidian handoff 문서에 반영.

## P0 — 다음 실제 작업: 개인 서버 IP-only smoke

상세 체크리스트는 [[Human Action Checklist]]를 기준으로 한다.

- [x] 개인 서버 IP/OS/architecture 확인: SSH alias `trading-bot`, Ubuntu Linux `aarch64`.
- [x] Docker Compose 기반 배포 준비 스크립트 생성.
- [x] 서버 포트 scan 후 충돌 회피 후보 결정: Frontend `13030`, Backend `18080`, Postgres `127.0.0.1:15432`.
- [ ] 서버 포트/firewall 결정.
- [ ] sibling repo layout 준비.
- [x] OAuth Client ID/Secret을 `.env.server`에 숨김 입력으로 반영하는 `make server-oauth` helper 준비.
- [ ] Postgres volume/backup 위치 결정.
- [x] Backend/Frontend를 서버에서 구동.
- [x] 로컬 CLI에서 `AGENTFEED_ALLOW_INSECURE_API=1 AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1 agentfeed status` smoke.
- [x] 브라우저에서 `http://161.33.171.81:13030/feed` smoke. Playwright console 0 errors/warnings.

## P1 — 사람이 결정하면 agent가 이어서 할 일

- [ ] 개인 서버 정보 기준으로 `agentfeed-dev` 서버 runbook 작성.
- [x] 서버용 `.env.server`를 실제 IP/port 기준으로 생성하되 git에는 제외.
- [x] server smoke 결과를 Obsidian evidence로 반영: [[Server IP-only Smoke Evidence 2026-06-05]].
- [x] GitHub OAuth App Client ID/Secret을 `.env.server`에 반영할 helper 준비.
- [ ] OAuth live smoke는 서버 구동 후 owner 브라우저 GitHub 승인으로 실행.
- [ ] production domain이 생기면 hosted readiness와 `make commercial-readiness` 재실행.
- [ ] npm package 이름/license/homepage/trusted publishing 정책이 확정되면 release/publish 절차 준비.

## Deferred — 지금은 스킵/대기

- [ ] 실제 Frontend production domain 결정.
- [ ] 실제 Backend API production domain 결정.
- [ ] DNS record 구성.
- [ ] GitHub OAuth App callback production 설정.
- [ ] Production hosting/provider/PostgreSQL 선택.
- [ ] Backend production/staging env와 secrets 등록.
- [ ] Frontend deployment env 등록.
- [ ] 개인정보 처리방침, 이용약관, moderation/report 정책 결정.

## P2 — 제품 polish backlog

- [ ] Settings/Projects 편집 form의 label/id 연결을 더 촘촘하게 보강.
- [ ] Project/Profile tabs의 `aria-controls`/tabpanel 연결 보강.
- [ ] 사용자용 quick-start 문서와 개발자용 runbook 분리.
- [ ] commercial readiness evidence artifact 위치와 재실행 절차를 운영 runbook으로 분리.
- [ ] 실제 배포 후 [[Runtime Configuration]]에 production URL/환경 예시 추가.

## Public release 메모

- [ ] CLI `package.json.homepage`가 실제 domain 또는 GitHub/docs URL을 가리키도록 정리.
- [ ] `license: UNLICENSED` 유지 여부 결정. public npm 배포 전 owner가 정책을 확정해야 한다.
- [ ] npm package 이름/README/install command 최종 확인.
- [x] Frontend landing copy의 `agentfeed preview --remote` 문구 점검. 현재 CLI에 `preview --remote`가 존재하므로 유지 가능.
- [ ] Backend integration guide의 예시 command가 현재 CLI 명령과 일치하는지 점검.
