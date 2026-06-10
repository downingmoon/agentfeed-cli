---
title: Personal Server Deploy 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/deploy
  - agentfeed/personal-server
status: done
---

# Personal Server Deploy 2026-06-10

> [!success]
> 2026-06-10 개인서버 배포를 1회 실행했고, 공개 포트 기준 주요 엔드포인트가 정상 응답하는 것을 확인했다.

## 배포 입력

- 배포 스크립트: `agentfeed-dev/scripts/server-deploy.sh --execute --up`
- SSH host: `trading-bot`
- 서버 루트: `~/agentfeed`
- 공개 API: `http://161.33.171.81:18080/v1`
- 공개 Frontend: `http://161.33.171.81:13030`

## 배포된 리비전

- [[AgentFeed CLI]]: `13aefed Document project visibility select guard`
- [[AgentFeed Frontend]]: `5967f56 Parse project visibility selects explicitly`
- [[AgentFeed Backend]]: `9abcc26 Mark browser sessions without probing guests`
- [[AgentFeed Dev]]: `622293e Gate strict client error response schemas`

## 검증 결과

| 항목 | 결과 |
| --- | --- |
| Backend container | `healthy` |
| Frontend container | `healthy` |
| Postgres container | `healthy` |
| `GET /v1/health` | `200` |
| `GET /v1/metadata` | `200` |
| `GET /` | `200` |
| `GET /feed` | `200` |
| `GET /cli/authorize` | `200` |

## 메모

- Frontend는 컨테이너 재생성 직후 약 40초 정도 `connection refused` 상태였고, 이후 정상적으로 `200` 응답으로 전환됐다.
- 이번 배포는 사용자의 명시 요청에 따른 1회 배포다.
- 기존 commercial-readiness goal의 기본 정책은 여전히 “서버/인프라/CICD 보류”로 유지한다.

## 후속 확인 후보

- 실제 브라우저 로그인 플로우 smoke test
- `agentfeed login -> collect -> publish -> review` 전체 원격 플로우 재검증
- 서버 DB 초기화가 필요한 테스트 전에는 별도 승인 후 진행
