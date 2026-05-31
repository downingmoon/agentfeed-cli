---
title: Commercial Readiness Hardening - CLI Token Stdin Login 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/auth
  - security/credentials
  - project/tasks
status: done
created: 2026-05-31
---

# Commercial Readiness Hardening - CLI Token Stdin Login 2026-05-31

## 목적

`agentfeed login --token <token>`는 편리하지만 raw token이 shell history, process argv, terminal scrollback에 남을 수 있습니다. 상용 CLI에서는 browser login을 기본값으로 유지하면서, 이미 발급된 token을 붙여넣는 경로도 argv를 거치지 않게 해야 합니다.

> [!important]
> token은 URL/stdout/stderr/argv에 노출하지 않는 경로를 우선 안내합니다. 직접 `--token <token>`은 backward-compatible dev escape hatch로만 남깁니다.

## 변경 사항

- `src/cli/index.ts`
  - `agentfeed login --token-stdin` 추가.
  - `agentfeed login --token -`도 stdin token 입력으로 처리.
  - stdin이 비어 있으면 명확한 remediation error를 반환.
  - `--token <token>`과 stdin 입력 방식을 동시에 쓰면 실패.
  - `help`, preview/publish missing-token 안내를 stdin-first 문구로 수정.
- `src/auth/browser-login.ts`
  - CI browser-login guard remediation을 `AGENTFEED_TOKEN` 또는 `--token-stdin`으로 수정.
- `src/config/credentials.ts`
  - missing token 안내를 browser login 또는 stdin token login으로 수정.
- `tests/cli-status-doctor.test.ts`
  - RED/GREEN 회귀 테스트: stdin으로 받은 token을 저장하되 stdout/stderr에는 노출하지 않음.
  - CI guard 안내가 `--token-stdin`을 제안하는지 검증.
- `README.md` / [[AgentFeed CLI README]]
  - quick start는 browser login 기본 경로로 변경.
  - token handoff는 `printf '%s' "$AGENTFEED_TOKEN" | agentfeed login --token-stdin`를 권장.

## 검증 증거

- RED: `npm test -- --run tests/cli-status-doctor.test.ts -t "login reads a token from stdin"` → 기존 구현에서 CI browser-login guard로 실패
- GREEN:
  - `npm test -- --run tests/cli-status-doctor.test.ts -t "login reads a token from stdin"` → passed
  - `npm test -- --run tests/cli-status-doctor.test.ts` → passed (9 tests)
  - `npm run typecheck` → passed
  - `npm test -- --run` → passed (234 tests)
  - `npm pack --dry-run` → passed (`prepack` build/typecheck/test gate 포함)
  - `make test` in `agentfeed-dev` → passed (CLI, Frontend, Backend, Alembic offline migration gate)

## 남은 리스크

> [!warning]
> `agentfeed login --token <token>`은 기존 자동화 호환성을 위해 유지합니다. 문서/도움말은 stdin-first로 바꿨지만, 향후 major version에서는 direct token argv 사용 시 warning 또는 deprecation을 검토할 수 있습니다.

## 관련 링크

- [[Auth & Credential Safety#2026-05-31 CLI token stdin login]]
- [[Integration - CLI Backend Frontend#2026-05-31 CLI token stdin login 계약]]
- [[Active Tasks#P1 후보]]
