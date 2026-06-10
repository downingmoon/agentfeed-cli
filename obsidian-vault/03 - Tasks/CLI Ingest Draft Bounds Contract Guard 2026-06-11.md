---
title: CLI Ingest Draft Bounds Contract Guard 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - backend
  - api-contract
  - ingestion
  - validation
  - contract-mismatch
status: done
related:
  - "[[Frontend Settings Timezone Profile Contract Guard 2026-06-11]]"
  - "[[Frontend Privacy Finding Resolution Contract Guard 2026-06-11]]"
---

# CLI Ingest Draft Bounds Contract Guard 2026-06-11

## 요약

Backend `IngestRequest`는 project/source/worklog/privacy scan 필드에 명확한 max length / max item 제한을 둔다.
CLI `LocalDraft` validator는 enum/type 형식은 확인했지만, hand-edit 또는 오래된 draft가 이 제한을 넘는 경우 일부를 로컬에서 통과시킬 수 있었다.

이번 작업은 신규 기능이 아니라 **Backend ingest contract보다 느슨한 CLI draft boundary를 맞춘 contract guard**다.

## 변경

- `src/draft/validation-primitives.ts`
  - `requireStringMax()` / `optionalStringOrNullMax()` 추가
  - `requireArrayMax()` / `requireStringArrayMax()` / `optionalStringArrayOrNullMax()` 추가
  - Backend `min_length=1` 필드를 위한 빈 문자열/빈 array item 거부 옵션 추가
- `src/draft/validation.ts`
  - Backend ingest schema와 맞춘 제한을 로컬 draft 검증에 반영
  - 대표 범위:
    - `project.name` 100자
    - source `tool_version`/`host_label` 100자, `session_id`/`collection_fingerprint` 200자
    - worklog `title` 200자, `summary` 8000자, `user_note` 4000자, `model` 100자, `public_prompt` 12000자
    - `tags` 20개 및 tag 50자, `changed_areas` 50개 및 item 240자, `outcome` 50개, `timeline` 100개
    - timeline title 200자, description 1000자
    - privacy findings 50개, id 100자, field 100자, message 2000자
    - metrics `models_used`/`agent_metrics`/`agent_modes` 및 per-agent `agent_modes` 20개
  - Backend에서 `min_length=1`인 필드(`project.name`, worklog `title`/`summary`, timeline title, privacy id/message/field, tag/changed_area item)는 빈 문자열도 로컬에서 거부
- `tests/draft-validation.test.ts`
  - oversized backend-bound string fields가 `readDraft()`에서 거부되는지 검증
  - oversized backend-bound arrays가 `readDraft()`에서 거부되는지 검증
  - empty backend-required strings / empty bounded string-array items가 `readDraft()`에서 거부되는지 검증

## 검증

Red 단계에서 새 테스트는 기존 validator가 oversize draft를 통과시켜 실패했다.

```bash
npm test -- --run tests/draft-validation.test.ts
```

Green 이후 검증:

```bash
npm test -- --run tests/draft-validation.test.ts
npm test -- --run tests/draft-validation.test.ts tests/api-hook.test.ts
npm run typecheck
npm run build
npm test -- --run
git diff --check
```

결과: 모두 통과. 최종 전체 테스트는 34개 파일 / 606개 테스트 통과.

추가 확인:

```bash
mcp_lsp.diagnostics src/draft/validation.ts
```

결과: `typescript-language-server` 미설치로 LSP 검증은 실행 불가. 대신 `tsc --noEmit`, build, 전체 Vitest로 대체했다.

## 제약 / 남은 리스크

> [!warning]
> `src/draft/validation.ts`와 `src/draft/validation-primitives.ts`는 이번 변경 후 각각 200 LOC warning band에 들어갔다. 다음 validation 관련 변경 전에는 ingest limits/field validators를 별도 cohesive module로 분리하는 것을 우선 검토해야 한다.

- Backend `collection_sources`에는 현재 max item contract가 없어 CLI도 별도 상한을 강제하지 않았다.
- 서버/인프라/CICD/배포 작업은 현재 goal 제약에 따라 수행하지 않았다.
