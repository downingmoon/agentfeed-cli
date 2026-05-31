---
title: Commercial Readiness Audit Followups 2026-05-31
aliases:
  - 2026-05-31 Audit Followups
created: 2026-05-31
updated: 2026-05-31
status: backlog
tags:
  - agentfeed/commercial-readiness
  - agentfeed/audit
  - project/task
---

# Commercial Readiness Audit Followups 2026-05-31

> [!info]
> Backend / Frontend / CLI read-only audit에서 새로 발견된 상용화 readiness follow-up입니다. 이미 이번 CLI pass에서 처리한 항목은 [[Commercial Readiness Hardening - CLI Command and Token Trust Boundary 2026-05-31]]로 이동했습니다.

## P1

## P2

### Backend token-authenticated ingestion token rotation risk

- 파일: `agentfeed-backend/app/dependencies.py`, `agentfeed-backend/app/routers/ingest.py`, `agentfeed-backend/app/services/ingestion_tokens.py`, `agentfeed-backend/app/config.py`
- 문제: 현재 ingestion token 자체만으로 `/v1/ingest/token/rotate`가 가능하면 leaked token이 새 장기 token으로 self-rotate할 수 있습니다.
- 후보: browser/session-authenticated token management rotate만 기본 권장하고, token-authenticated renewal은 만료 임박 window / token-family reuse detection / notification / suspicious reuse family revoke를 검토합니다.

## 처리 완료로 이동된 항목

- [x] Backend invalid/random Bearer header rate-limit bypass
- [x] Backend ingested privacy finding pre-resolved publish bypass
- [x] Frontend Settings privacy/default visibility controls
- [x] CLI configured command shell wrapper refusal
- [x] CLI configured command sensitive env scrub
- [x] CLI literal argv token login default-disable
- [x] CLI privacy scanner authorization header / credentialed URL / IPv6 private URL redaction
- [x] Frontend leaderboard malformed-row isolation — [[Commercial Readiness Hardening - Profile Follow Hydration and Leaderboard Resilience 2026-05-31]]
- [x] Frontend profile follow control hydration — [[Commercial Readiness Hardening - Profile Follow Hydration and Leaderboard Resilience 2026-05-31]]

