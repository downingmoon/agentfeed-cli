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

## 2026-05-30 Windows path redaction

> [!success]
> Windows absolute path(`C:\Users\...`)도 Unix absolute path와 같은 `sensitive_path` finding으로 redaction합니다.

문제:

- 기존 path redaction은 `/Users/...`, `/home/...` 같은 Unix-style absolute path만 탐지했습니다.
- Windows 사용자 이름과 로컬 폴더 구조가 `summary`, `timeline`, `changed_areas` 같은 public field에 남을 수 있었습니다.

계약:

- `C:\Users\Downing\project\src\index.ts` 형태의 drive-letter absolute path는 `[REDACTED_PATH]`로 치환합니다.
- finding type은 기존 UI/Backend 계약과 같은 `sensitive_path`를 유지합니다.

검증:

- RED/GREEN: `npx vitest run tests/privacy.test.ts --testNamePattern 'Windows absolute'`
- `npm test -- --run tests/privacy.test.ts tests/cli-share.test.ts tests/api-hook.test.ts tests/open-browser.test.ts`
- `npm run typecheck`
- `../agentfeed-dev/scripts/test-all.sh`

## 관련 링크

- [[AgentFeed Local CLI MVP Spec v0.2#17. Privacy Scanner]]
- [[Collection System#수집 품질 원칙]]
- [[Active Tasks#P2 후보]]
- [[Integration - CLI Backend Frontend#2026-05-30 Windows path redaction]]
- [[Integration - CLI Backend Frontend#2026-05-30 Unlisted publish privacy gate]]

## 2026-05-30 Social mutation visibility gate

> [!success]
> Private worklog는 owner가 아닌 사용자가 like/bookmark/report 같은 social mutation으로 접근하거나 notification payload를 유발할 수 없습니다.

보안 계약:

- private worklog social mutation은 comment visibility gate와 같은 기준을 사용합니다.
- 비소유자는 `NotFoundError`를 받으며, mutation과 notification 생성이 모두 발생하지 않습니다.
- public/unlisted worklog는 기존 social UX를 유지합니다.

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 Social mutation visibility gate]]

## 2026-05-30 CLI draft id path safety

> [!success]
> Draft id는 더 이상 filesystem path segment로 직접 신뢰하지 않습니다.

보안 계약:

- draft id는 letters, numbers, `_`, `-`만 허용합니다.
- `readDraft`, `writeDraft`, `listDrafts`, `discard`는 같은 safe path helper를 사용합니다.
- traversal id로 `.agentfeed/credentials.json` 같은 민감 파일을 읽거나 삭제할 수 없습니다.

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 CLI draft id path safety]]

## 2026-05-30 Private comment report visibility gate

> [!success]
> Comment report mutation도 comment가 속한 worklog visibility를 통과해야 합니다.

보안 계약:

- private worklog comment는 owner만 report할 수 있습니다.
- 비소유자는 report target 존재 여부를 알 수 없도록 `NotFoundError`를 받습니다.
- report row와 notification side effect는 생성되지 않습니다.

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 Private comment report visibility gate]]

## 2026-05-30 Public surface published-status gate

> [!success]
> Review 전 worklog는 `visibility` 값이 public이어도 public surface와 direct non-owner read에서 제외됩니다.

핵심 계약:

- Public 노출 조건은 `visibility=public` 단독이 아니라 `visibility=public` + `status=public` + `published_at IS NOT NULL`입니다.
- Project/User public stats도 같은 조건을 적용해 unpublished/private metric이 외부에 섞이지 않게 합니다.

관련 링크:

- [[Integration - CLI Backend Frontend#2026-05-30 Public surface published-status gate]]
