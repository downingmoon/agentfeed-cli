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

## 2026-05-30 Comment settings enforcement

> [!success]
> 작성자가 댓글을 비활성화하면 비작성자는 더 이상 해당 worklog에 새 comment를 만들 수 없습니다.

보안/프라이버시 계약:

- `allow_comments=false`는 public/unlisted visibility와 별개로 comment creation을 막습니다.
- 작성자는 자기 worklog에 follow-up을 남길 수 있습니다.
- 차단된 요청은 `403 Forbidden`으로 종료되고 comment/notification side effect를 남기지 않습니다.

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 Comment settings enforcement]]


## 2026-05-30 Soft-deleted project metadata gate

> [!success]
> Project soft-delete는 project 자체 조회뿐 아니라 worklog 기반 public card/detail payload에도 적용됩니다.

프라이버시 계약:

- 삭제된 project는 worklog가 public이어도 `project` payload를 반환하지 않습니다.
- private project redaction(`Private project`)과 deleted project omission(`null`)은 구분합니다.
- 새 worklog card/detail 표면은 shared helper 또는 `_build_project_card()`를 통과해야 합니다.

검증 링크: [[Integration - CLI Backend Frontend#2026-05-30 Soft-deleted project metadata gate]]

## 2026-05-30 Public metric privacy settings

> [!success]
> 공개 surface는 사용자의 metric 공개 설정을 실제 payload와 aggregate에 반영합니다.

프라이버시 계약:

- `show_token_usage_publicly=false` → public card/detail/activity/profile/project token metric은 `null` 또는 ranking 제외입니다.
- `show_estimated_cost_publicly=false` → public card/detail estimated cost는 `null`입니다. 기본값도 false입니다.
- `show_file_count_publicly=false` → public file count metric은 `null`입니다.
- `show_line_count_publicly=false` → public added/removed line metric은 `null`입니다.
- `show_test_count_publicly=false` → public test run/pass metric과 tests leaderboard aggregate는 숨깁니다.
- author/review/private dashboard 경로는 자신의 full metric 검토를 위해 기존 값을 유지합니다.
- aggregate는 숨김 row를 빼고 합산하지 않고, 해당 metric 전체를 `null`로 반환합니다. 이는 partial sum을 실제 total로 오해하지 않게 하기 위한 선택입니다.

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 Public metric privacy settings]]

## 2026-05-30 CLI token/path/repository redaction hardening

> [!success]
> AgentFeed 자체 token, userinfo가 포함된 Git remote URL, 공백/유니코드 local path가 public draft/upload payload에 남지 않도록 보강했습니다.

계약:

- `af_live_*`, `af_test_*`, `af_dev_*`는 high severity secret으로 탐지해 `[REDACTED_SECRET]` 처리합니다.
- POSIX/Windows/UNC absolute path는 공백과 유니코드 segment를 포함해 `[REDACTED_PATH]`로 치환합니다.
- `https://user:pass@host/repo.git` 형태 repository URL은 저장/수집/upload 전에 userinfo를 제거합니다.
- upload source payload는 raw `host_label`을 전송하지 않고, `session_id` / `local_draft_id`는 hash alias만 전송합니다.

검증:

- `npm test -- --run tests/config.test.ts tests/privacy.test.ts tests/api-hook.test.ts`
- `npm run typecheck && npm test`

## 2026-05-30 Public source/privacy discovery boundary

> [!success]
> Public/card/detail/search/bookmark surface에서 raw source metadata와 privacy scan detail이 외부 사용자에게 노출되지 않도록 축소했습니다.

계약:

- public worklog `source`는 `agent`, `tool_version`, `collection_quality`만 반환합니다.
- `host_label`, `session_id`, `local_draft_id`, `collection_fingerprint`, `collection_window`는 public payload에서 제외합니다.
- public detail의 `privacy_scan`은 status와 빈 findings만 반환합니다.
- owner review endpoint는 기존처럼 상세 findings를 유지합니다.
- `allow_search_indexing=false` 작성자의 worklog/user/project/prompt/suggestion은 discovery에서 제외합니다.
- 타인이 bookmark한 worklog가 private/unpublished로 바뀌면 `/me/bookmarks`에서 제외합니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest -q` → 84 passed

관련: [[Commercial Readiness Audit 2026-05-30#Backend public/privacy boundary]]


## 2026-05-30 Tags search-indexing privacy gate

> [!success]
> Public tag aggregation도 search-indexing opt-out을 존중합니다.

계약:

- `/v1/tags`는 public/published worklog만 집계합니다.
- `user_settings.allow_search_indexing=false`인 author의 tags는 aggregation에서 제외합니다.
- query filtering branch와 default top-tags branch가 같은 privacy predicate를 사용합니다.

관련 구현: [[Commercial Readiness Hardening - Token Quotas Privacy Tags and Card Actions 2026-05-30]]

## 2026-05-31 Public URL field validation

> [!success]
> Public profile/project URL fields가 unsafe scheme 또는 credentialed URL을 저장·재노출하지 않도록 schema boundary에서 차단합니다.

계약:

- `website_url`, `repository_url`, `homepage_url`은 http/https만 허용합니다.
- URL userinfo는 phishing/secret leak 위험 때문에 거부합니다.
- `github_url`은 GitHub host, `x_url`은 X/Twitter host로 제한합니다.
- 빈 문자열은 `None`으로 정규화합니다.

관련 구현: [[Commercial Readiness Hardening - Discovery Rate Limits URL Safety and Adapter Resilience 2026-05-31]]

## 2026-05-31 Private user note public-surface guard

- `user_note`는 owner review context로 유지하되 public card/detail payload와 frontend public adapter에서는 노출하지 않는다.
- Worklog review preview contract는 `private_fields: ["user_note"]`와 `safe_public_preview: true`를 제공해 Frontend가 public/unlisted publish를 안전하게 판정할 수 있게 한다.
