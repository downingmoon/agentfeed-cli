---
title: Commercial Readiness Hardening - Backend Public URL Resolution Safety 2026-06-01
aliases:
  - Backend public URL resolution safety
  - 2026-06-01 public URL SSRF boundary
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/privacy
  - agentfeed/security
status: done
created: 2026-06-01
---

# Commercial Readiness Hardening - Backend Public URL Resolution Safety 2026-06-01

> [!abstract] 목적
> User/profile/project/ingest public URL 필드가 private/internal host를 우회 표현으로 저장하지 못하도록 Backend schema boundary를 보강합니다.

## 문제

- 기존 `validate_public_http_url()`은 canonical IP literal과 `localhost`/`.local`만 차단했습니다.
- `2130706433`, `0x7f000001`, `017700000001`, `127.1` 같은 legacy IPv4 literal은 hostname처럼 통과할 수 있었습니다.
- NAT64 IPv6 형태로 private IPv4를 embed한 host와, 현재 DNS가 private/link-local 주소로 해석되는 hostname에 대한 방어가 없었습니다.

## 수정

- `app/schemas/url_fields.py`에 public IP 판정 helper를 추가했습니다.
- IPv4-mapped IPv6, 6to4, Teredo, NAT64 embedded IPv4에서 private/non-global address를 reject합니다.
- `socket.inet_aton()`이 해석하는 legacy IPv4 literal은 ambiguous host 표현으로 reject합니다.
- hostname DNS resolution 결과 중 하나라도 non-public address이면 public URL schema validation이 실패합니다.
- DNS lookup 실패는 storage-time availability를 위해 기존 hostname validation으로 fallback하지만, definite private resolution은 fail-closed합니다.

## 검증 증거

- `uv run pytest tests/test_contracts.py -k 'public_url_schemas_reject' -q` → 2 passed
- `uv run ruff check app/schemas/url_fields.py tests/test_contracts.py` → passed
- `uv run ruff check .` → passed
- `uv run pytest -q` → 261 passed, 1 warning
- `agentfeed-dev ./scripts/test-all.sh` → CLI 285 passed, Frontend CI/build passed, Backend 261 passed + Alembic offline chain passed

## 연결

- [[Privacy Safety#2026-06-01 Backend public URL resolution safety]]
- [[Integration - CLI Backend Frontend#2026-06-01 Backend public URL resolution safety]]
- [[Active Tasks]]
