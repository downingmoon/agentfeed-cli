---
title: CLI Privacy Sample Upload Strip 2026-06-08
date: 2026-06-08
tags:
  - agentfeed
  - cli
  - privacy
  - contract
status: done
---

# CLI Privacy Sample Upload Strip 2026-06-08

## 목적

CLI local draft의 privacy finding에는 사용자가 터미널/로컬 리뷰에서 확인할 수 있는 `sample_redacted`가 존재하지만, Backend ingest contract와 Frontend review contract에는 해당 필드가 없다. Enterprise 품질 기준에서는 “서버가 무시할 extra field”를 보내는 것보다, 업로드 boundary에서 명시적으로 제거하는 편이 안전하다.

## 결정

- `sample_redacted`는 **로컬 draft evidence로만 유지**한다.
- `/v1/ingest/worklogs`와 `/v1/ingest/worklogs/preview`에 보낼 payload에서는 `privacy_scan.findings[].sample_redacted`를 제거한다.
- Backend/Frontend에 새 표시 기능은 추가하지 않는다.

## 변경

- `src/privacy/draft-sanitizer.ts`
  - `sanitizedDraftForUpload()`가 redaction 후 upload copy의 `sample_redacted`만 제거한다.
  - 원본 draft는 건드리지 않는다.
- `tests/api-hook.test.ts`
  - 수동 수정 draft upload 시 서버 payload에는 `sample_redacted`가 없고, 저장된 로컬 draft에는 `sample_redacted`가 남는 회귀 테스트를 추가했다.

## 검증

```bash
npm test -- --run tests/api-hook.test.ts
npm run typecheck
git diff --check
```

결과:

- `tests/api-hook.test.ts`: `89 passed`
- TypeScript typecheck: pass
- whitespace diff check: pass

## 연계 작업

- [[Backend Ingest Strict Contract 2026-06-08]] — Backend ingest boundary도 `sample_redacted` 같은 계약 밖 필드를 fail-closed로 거부하도록 보강했다.

## 후행 과제

> [!note]
> `sample_redacted`를 서버/Frontend에 표시하는 기능은 지금 추가하지 않았다. 나중에 사용자가 “웹 리뷰에서 redacted sample을 보여줘”라고 명확히 요청하면, 민감정보 문구/저장 정책/삭제 정책을 먼저 설계한 뒤 Backend schema와 Frontend UI를 함께 변경한다.
