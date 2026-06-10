---
title: Backend OAuth State Parser Boundary Guard 2026-06-10
aliases:
  - Backend OAuth State Parser Boundary Guard
status: done
tags:
  - agentfeed/backend
  - agentfeed/auth
  - agentfeed/contract
  - agentfeed/verification
updated: 2026-06-10
---

# Backend OAuth State Parser Boundary Guard 2026-06-10

> [!success] 결론
> GitHub OAuth/CLI login redirect의 state parser에서 broad `except Exception` masking을 제거했다. malformed state는 기존처럼 `OAUTH_STATE_INVALID`로 처리하지만, parser 내부 programming/runtime bug는 더 이상 invalid state처럼 숨기지 않고 드러난다.

## 변경 범위

- Backend `app/oauth_state.py`
  - OAuth next-state allowlist, query/hash sanitizer, state encode/decode helper를 `app/routers/auth.py`에서 분리.
  - `except Exception` catch-all 대신 expected decode/parse 계열 예외만 `OAUTH_STATE_INVALID`로 변환.
  - signed JSON payload가 object가 아닌 경우도 malformed state로 명시 처리.
- Backend `app/routers/auth.py`
  - route/auth session orchestration만 남기고 OAuth state parsing 책임 제거.
  - pure LOC가 약 `648` → `459`로 감소.
- Backend tests
  - malformed signed non-object payload 회귀 테스트 추가.
  - parser 내부 `RuntimeError`가 invalid OAuth state로 masking되지 않는 회귀 테스트 추가.
  - `app/oauth_state.py`에 `except Exception`/`except BaseException` 재도입 방지 source contract 추가.

## Contract rule

```text
Malformed OAuth state input should become OAUTH_STATE_INVALID.
OAuth state parser programming/runtime errors must not be hidden as OAUTH_STATE_INVALID.
```

> [!warning] 유지 규칙
> OAuth state는 인증/CLI-login 경계다. 사용자 입력 오류와 내부 parser 결함을 같은 invalid-state UX로 합치면 실제 장애를 추적하기 어렵다.

## Verification evidence

- Red 확인:
  - `uv run pytest tests/test_auth_contracts.py::test_github_oauth_state_decode_does_not_mask_programming_errors -q` → 기존 broad catch 때문에 `AgentFeedError`로 실패.
  - `uv run pytest tests/test_auth_contracts.py::test_github_oauth_state_rejects_signed_non_object_payload -q` → 기존 list payload에서 `AttributeError`로 실패.
- Targeted:
  - `uv run pytest tests/test_auth_contracts.py tests/test_github_oauth_contracts.py tests/test_provider_token_contracts.py -q` → `41 passed`.
- Full backend:
  - `uv run pytest -q` → `433 passed, 1 warning`.
  - `uv run ruff check .` → pass.
- Manual HTTP smoke:
  - `uv run python` + `TestClient(app, raise_server_exceptions=False)`:
    - `/health` → `200 application/json`.
    - `/v1/metadata` → `200 application/json`.
- Static scan:
  - `rg "except Exception|except BaseException" app/oauth_state.py` → no matches.
- LOC check:
  - `app/oauth_state.py` → 205 logical lines.
  - `app/routers/auth.py` → 459 logical lines.
- Not tested:
  - LSP diagnostics: local `basedpyright-langserver` is not installed.

## Follow-up

> [!todo]
> `app/routers/auth.py` is still above the 250 pure-LOC target. It is improved but should be split further by CLI auth session operations, browser session cookie helpers, and GitHub callback orchestration in future cleanup slices.

## Related

- [[Backend Readiness Broad Catch Guard 2026-06-10]]
- [[CLI API JSON Boundary Guard 2026-06-10]]
- [[Frontend API JSON Boundary Guard 2026-06-10]]
