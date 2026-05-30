---
title: Privacy Safety
aliases:
  - AgentFeed Privacy
  - Redaction Safety
tags:
  - agentfeed/cli
  - agentfeed/privacy
status: active
created: 2026-05-30
---

# Privacy Safety

> [!abstract] 목적
> 공개 feed로 넘어갈 수 있는 draft 필드에서 secret, local path, private URL, email 등을 원문 노출 없이 검출·치환한다.

## Scan 대상

업로드 가능한 public field만 scan한다.

- `title`
- `summary`
- `public_prompt`
- `outcome`
- `timeline.title`
- `timeline.description`
- `changed_areas`
- `tags`
- `project.name`
- `project.repository_url`

## Redaction dry-run UX

> [!success] 2026-05-30 구현됨
> `agentfeed scan --id <draft_id> --dry-run`은 draft를 수정하지 않고 안전한 redaction preview를 보여준다.

Dry-run 출력 원칙:

- privacy status와 finding count 표시
- finding별 `severity`, `type`, `field`, redaction placeholder 표시
- 실제 secret 원문은 표시하지 않음
- 바뀔 field의 redacted preview 표시
- `Dry run: draft not modified.`를 출력해 저장되지 않았음을 명확히 표시

예시:

```text
Privacy: danger
Findings: 1
Dry run: draft not modified.
Findings detail:
- [high] api_key_pattern at summary -> [REDACTED_SECRET]
Redacted preview:
- summary: Deploy with [REDACTED_SECRET]
```

## 일반 scan UX

`agentfeed scan --id <draft_id>`는 dry-run과 같은 상세 리포트를 출력하되, draft의 public field를 redacted 값으로 실제 갱신하고 `privacy_scan`도 저장한다.

> [!warning] Publish safety
> 수동으로 draft JSON/Markdown을 수정한 뒤 secret이 들어가도, 일반 scan을 다시 실행하면 publish payload에 원문 secret이 남지 않아야 한다.

## 2026-05-30 Upload-time privacy re-scan

> [!success]
> `agentfeed publish` / `agentfeed share --upload` 경로에서 draft public field를 업로드 직전에 다시 scan하고 redaction을 저장하도록 보정했습니다.

문제:

- 사용자가 `.agentfeed/drafts/*.json`을 직접 수정하거나 외부 도구가 draft를 만진 경우, 최초 collect 시점의 `privacy_scan`이 최신 public field를 보장하지 못했습니다.
- 이 상태에서 바로 publish하면 `summary`, `public_prompt`, `project.repository_url` 등에 새로 들어간 secret/private URL이 payload에 남을 수 있었습니다.

수정:

- draft public field 추출/redaction 적용 로직을 `draft-sanitizer`로 분리했습니다.
- 업로드 payload 변환 시 항상 clone을 재-scan해 안전한 payload만 전송합니다.
- publish 성공 후 저장되는 local draft에도 redacted field와 최신 `privacy_scan`을 반영합니다.
- 이미 redacted된 clone을 다시 payload화할 때 이전 위험 findings가 `safe`로 덮이지 않도록 보존합니다.

검증:

- `re-scans manually edited draft fields before upload and persists redactions` 회귀 테스트
- `npm test -- tests/api-hook.test.ts --run`
- `npm test -- --run`

## 관련 링크

- [[AgentFeed Local CLI MVP Spec v0.2#17. Privacy Scanner]]
- [[Collection System#수집 품질 원칙]]
- [[Active Tasks#P2 후보]]
