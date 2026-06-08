---
title: CLI Privacy Severity Contract Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/contracts
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - project/tasks
aliases:
  - CLI privacy severity guard
---

# CLI Privacy Severity Contract Guard 2026-06-08

> [!success] 완료
> Backend/Frontend privacy finding severity contract는 `info | low | medium | high | critical | unknown`으로 닫혀 있었지만, CLI local draft/ingest type과 validator는 `low | medium | high`만 허용했다. CLI를 같은 severity union으로 확장하고, `critical` unresolved finding도 public/unlisted publish blocker로 취급하도록 share policy copy와 guard를 맞췄다.

## 배경

[[Privacy Finding Enum Contract Guard 2026-06-08]]에서 Backend와 Frontend의 privacy finding enum은 일치했지만, CLI draft validator가 Backend-supported severity 일부만 받아서 CLI-Backend ingest contract가 좁게 어긋나 있었다. Enterprise 품질 기준에서는 로컬 draft가 Backend에서 유효한 privacy severity를 손상 없이 보존해야 한다.

## 변경 범위

### CLI

- `src/types.ts`
  - `PrivacySeverity`를 `info | low | medium | high | critical | unknown`으로 확장.
- `src/draft/validation.ts`
  - `PRIVACY_SEVERITIES` validator set을 Backend `PrivacySeverity`와 일치.
- `src/cli/share.ts`
  - unresolved `critical` privacy finding도 public/unlisted publish blocker로 처리.
  - 안내 문구를 `high/critical-severity` 기준으로 명확화.
- `tests/git-draft.test.ts`
  - local draft validation이 Backend-supported 모든 privacy severity를 round-trip하는 regression 추가.
  - unsupported `blocker` severity는 계속 reject.
- `tests/share.test.ts`, `tests/cli-share.test.ts`
  - high/critical policy copy와 unresolved critical blocker behavior 검증.

### Backend / Frontend

- 코드 변경 없음.
- Backend targeted evidence: `PrivacyFinding` / `IngestPrivacyFinding` enum rejection test 통과.
- Frontend targeted evidence: `npm run test:contracts` 통과.

## 검증 Evidence

```bash
# CLI targeted
npx vitest run tests/git-draft.test.ts tests/share.test.ts --reporter=verbose

# Backend contract evidence
uv run pytest tests/test_contracts.py::test_privacy_finding_contract_rejects_unknown_type_and_severity

# Frontend contract evidence
npm run test:contracts

# CLI full release gate
npm run release:preflight
```

- CLI targeted: `2 test files`, `36 tests passed`.
- Backend targeted: `1 passed`.
- Frontend contract: 통과.
- CLI release preflight: `27 test files`, `570 tests passed`; tarball/installed package smoke 통과.

## 후행 과제

> [!todo]
> CLI privacy scanner는 현재 대부분 `low | medium | high`만 산출한다. 추후 scanner가 `critical` 또는 `info`를 직접 산출하도록 정책을 세분화할지 여부는 별도 제품/보안 정책 문서로 결정한다.
