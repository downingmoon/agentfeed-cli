---
title: Commercial Readiness Hardening - Settings Named Token Creation 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/auth
  - security/credentials
  - project/tasks
status: done
created: 2026-05-31
---

# Commercial Readiness Hardening - Settings Named Token Creation 2026-05-31

## 목적

Backend는 `POST /me/ingestion-tokens`로 named ingestion token 생성을 지원하지만, Frontend Settings는 기존 token 목록/rotate/revoke 중심이어서 새 기기 연결을 위해 CLI browser login 안내에 의존했습니다. 사용자는 Settings에서 이름을 붙여 token을 만들고, one-time secret을 복사한 뒤 CLI에 안전하게 전달할 수 있어야 합니다.

> [!important]
> 새 token secret은 생성/회전 직후 한 번만 표시하고, CLI 연결 안내는 argv 노출을 줄이는 `agentfeed login --token-stdin` 경로를 사용합니다.

## 변경 사항

- `agentfeed-frontend/src/lib/api.ts`
  - `ApiCreatedIngestionToken` 타입을 추가했습니다.
  - `me.createIngestionToken(name)`이 `POST /me/ingestion-tokens`에 `{ name }` JSON body를 전송합니다.
- `agentfeed-frontend/src/components/pages/SettingsPage.tsx`
  - token section에 named token 생성 form을 추가했습니다.
  - 생성 성공 시 token 목록을 refresh하고 one-time secret panel을 표시합니다.
  - 생성/회전 secret panel을 `oneTimeSecret`으로 통합했습니다.
  - secret handoff 안내를 `printf '%s' "$AGENTFEED_TOKEN" | agentfeed login --token-stdin`로 변경했습니다.
  - one-time secret이 화면에 떠 있는 동안 생성/회전/취소로 덮어쓰지 않도록 token actions를 잠급니다.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - create token API가 정확한 endpoint/method/body를 사용하는지 검증합니다.
  - backend one-time secret을 반환 모델에서 보존하는지 검증합니다.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - SettingsPage가 `me.createIngestionToken(name)`을 호출하고 `--token-stdin` 안내를 유지하는지 고정합니다.
- `agentfeed-frontend/src/lib/integration-contract.ts`
  - create token response secret 타입 계약을 추가했습니다.

## 검증 증거

- RED:
  - `npm run test:contracts -- --run src/lib/page-source-contract.test.ts` → SettingsPage named token 생성 경로 부재로 실패
- GREEN:
  - `npm run test:contracts` → passed
  - `npm run lint` → passed
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` → passed
  - `make test` in `agentfeed-dev` → passed (CLI 234 tests + prepack, Frontend contracts/build, Backend 201 tests + Alembic offline migration)

## 남은 리스크

> [!note]
> 이 변경은 Frontend UX와 API client 계약입니다. Backend create token endpoint는 기존 구현을 사용합니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-31 Settings named ingestion token creation 계약]]
- [[Auth & Credential Safety#2026-05-31 CLI token stdin login]]
- [[Active Tasks#P2 후보]]
