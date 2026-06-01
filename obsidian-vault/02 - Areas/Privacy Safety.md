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

## 2026-06-02 public timeline and sensitive URL scan

> [!success]
> CLI scanner와 Backend publish fallback scan이 public field leak surface를 더 넓게 fail-closed로 검사합니다.

계약:

- CLI public draft scanner redacts `rediss://`, `mongodb+srv://`, loopback/unspecified/CGNAT/IPv4-mapped private URLs.
- Backend publish fallback scanner includes public `timeline` title/description/status fields.
- Timeline findings preserve concrete field paths such as `timeline.0.description`.

검증: [[Commercial Readiness Hardening - Public Timeline Settings and URL Privacy 2026-06-02#검증 증거]]


## 2026-06-02 fallback privacy and public adapter hardening

> [!success]
> Publish-time fallback privacy scans and public rendering adapters now fail closed when scanner data or Backend visibility filtering regresses.

계약:

- Backend publish fallback rescans public fields even after UI finding resolution for `server_publish_fallback` source.
- CLI and Backend token taxonomy both detect direct provider tokens including GitHub, GitLab, HuggingFace, and Stripe patterns.
- Frontend review publish treats missing/malformed privacy findings as blocking.
- Frontend public surfaces drop any worklog that is not both `status=public` and `visibility=public`.

검증: [[Commercial Readiness Hardening - CLI Approval Code Privacy Fallback and Public Adapter 2026-06-02#검증 증거]]


## 2026-06-01 Backend model privacy fallback scan

> [!success]
> Backend publish-time fallback privacy scan이 public review/feed에 노출되는 `model` 필드까지 검사합니다.

계약:

- Client scan이 없거나 stale한 `privacy_scan_json=None` 상태에서도 Backend는 publish 직전 public text fields를 다시 검사합니다.
- `model`에 secret/API key pattern이 있으면 public/unlisted publish는 `UnresolvedPrivacyFinding`으로 차단됩니다.
- Finding field는 `model`로 남아 review UI와 운영 디버깅에서 원인을 식별할 수 있어야 합니다.

검증: [[Commercial Readiness Hardening - Backend OAuth Username and Model Privacy Scan 2026-06-01#검증 증거]]


> [!abstract] 목적
> 공개 feed로 넘어갈 수 있는 draft 필드에서 secret, local path, private URL, email 등을 원문 노출 없이 검출·치환한다.

## 2026-06-01 Frontend external URL IPv6 safety

> [!success]
> Frontend project/profile external link renderer가 IPv6 loopback/private/internal literal을 outbound link로 렌더링하지 않도록 `safeExternalUrl()`을 보강했습니다.

계약:

- Public bare domain은 기존처럼 `https://`로 정규화합니다.
- URL userinfo, unsafe scheme, localhost/private IPv4는 계속 차단합니다.
- IPv6 `::1`, `::`, `fc00::/7`, `fe80::/10`, `::ffff:*` mapped forms를 차단합니다.

검증: [[Commercial Readiness Hardening - Frontend External URL IPv6 Safety 2026-06-01#검증 증거]]

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

## 2026-05-31 Discord token redaction

- Discord bot token-like pattern을 high severity `api_key_pattern`으로 탐지하고 `[REDACTED_SECRET]`으로 치환한다.
- `summary`, `user_note`, `public_prompt` 필드에서 동일하게 redaction한다.

## 2026-05-31 CLI private review privacy policy

> [!success]
> `agentfeed share` / `agentfeed publish`는 private review draft upload이며, public/unlisted publish가 아니라는 정책을 CLI 출력과 JSON output에 명시했습니다.

계약:

- high-severity privacy finding이 있으면 CLI preview/publish output에 public/unlisted publishing이 AgentFeed에서 차단된다고 표시합니다.
- private review upload는 허용되어 사용자가 web review에서 finding을 해결할 수 있습니다.
- `share --json` / `publish --json`은 `privacy_policy.private_review_upload`, `privacy_policy.public_publish_blocked`, `privacy_policy.review_required`를 포함합니다.
- public/unlisted publish 차단 자체는 Backend review publish API의 unresolved high-severity finding gate가 담당합니다.

검증: [[Commercial Readiness Hardening - CLI Private Review Privacy Policy 2026-05-31#검증 증거]]

## 2026-05-31 Smoke user_note privacy contract

> [!success]
> E2E smoke가 owner-only `user_note`를 public detail/feed에서 비노출하는 계약을 확인하도록 정렬했습니다.

- Review API: owner context용 `worklog.user_note` 보존
- Public detail/feed: `user_note`는 `None`, raw note text 없음
- Smoke script: 두 boundary를 모두 검증

관련 구현: [[Commercial Readiness Hardening - Smoke User Note Privacy Contract 2026-05-31]]


## 2026-05-31 Publish privacy severity fail-closed

> [!success]
> Public/unlisted publish는 unresolved `info`/`low`/`medium` 외 privacy severity를 모두 blocking으로 처리합니다.

계약:

- Backend publish API는 `high`, `critical`, `unknown`, blank/unknown taxonomy를 fail-closed blocking으로 처리합니다.
- Frontend review action도 같은 taxonomy로 publish button과 error copy를 제어합니다.
- Review API는 `PrivacyFinding` DB row가 있으면 stale `worklog.privacy_scan_json`보다 fresh row 상태를 우선합니다.
- Resolve 후 review payload는 fresh `resolved: true` / `resolution` 값을 반환하고, publish는 unresolved blocking finding이 없을 때만 허용됩니다.

검증: [[Commercial Readiness Hardening - Publish Privacy Severity Auth Smoke and Alembic Version Gate 2026-05-31#검증 증거]]

## 2026-05-31 Hydrated browser privacy smoke

> [!success]
> Public detail/feed privacy boundary를 API payload뿐 아니라 hydrated browser DOM에서도 검증합니다.

계약:

- Browser-rendered `/worklogs/{id}`는 published title과 model badge를 표시해야 합니다.
- Browser-rendered `/feed?agent=cursor&time_range=week`는 published card title과 Cursor label을 표시해야 합니다.
- 두 DOM 모두 owner-only `user_note` 원문과 public note copy를 포함하면 안 됩니다.
- DOM negative check는 page가 아직 loading이어서 false pass하지 않도록 title/agent positive assertion 이후에 수행합니다.

검증: [[Commercial Readiness Hardening - Hydrated Browser Privacy Smoke 2026-05-31#검증 증거]]

## 2026-05-31 CLI draft artifact private permissions

> [!success]
> CLI draft JSON/Markdown files now use private local filesystem permissions like credentials.

계약:

- `.agentfeed/drafts` directory는 `0o700`입니다.
- draft `.json` / `.md` artifact는 `0o600`으로 생성됩니다.
- 기존 draft 파일이 느슨한 mode로 존재해도 `writeDraft()` rewrite 후 다시 `0o600`으로 조입니다.
- chmod가 의미 없는 filesystem에서는 best-effort로 실패를 무시합니다.

검증: [[Commercial Readiness Hardening - CLI Draft Artifact Permissions 2026-05-31#검증 증거]]

## 2026-05-31 Header and URL privacy scanner expansion

> [!success]
> CLI public-safe scanner가 secret-bearing authorization header와 credentialed/private URL 패턴을 추가로 redaction합니다.

계약:

- `Authorization: Bearer|Basic|Token ...` header secret은 header prefix를 보존하고 value만 `[REDACTED_SECRET]`로 치환합니다.
- credentialed HTTP(S) URL은 전체 URL을 `[REDACTED_URL]`로 치환해 username/password/token userinfo를 노출하지 않습니다.
- IPv6 loopback, ULA/link-local, `169.254.0.0/16` metadata URL도 private URL로 redaction합니다.

검증: [[Commercial Readiness Hardening - CLI Privacy Scanner Header and URL Redaction 2026-05-31#검증 증거]]

## 2026-05-31 Settings privacy controls

> [!success]
> 사용자가 기본 공개 범위와 public metric 노출 여부를 Settings에서 직접 조정할 수 있습니다.

- Worklog / project default visibility는 API 필드명 그대로 UI state에 연결합니다.
- Estimated cost / file count / line count / test count public exposure toggle을 모두 추가했습니다.
- Database/API naming contract를 따라 frontend expectation을 backend field명에 맞췄습니다.

검증: [[Commercial Readiness Hardening - Settings Privacy Controls 2026-05-31#검증 증거]]

## 2026-05-31 Server-owned privacy finding resolution

> [!success]
> Ingest client가 privacy finding을 pre-resolved 상태로 보내도 Backend가 unresolved 상태로 저장합니다.

계약:

- `privacy_scan.findings[].resolved` / `resolution`은 ingest 저장 시 무시합니다.
- DB privacy finding row와 worklog `privacy_scan_json` 모두 unresolved로 시작합니다.
- Public/unlisted publish는 review route에서 resolution 처리된 뒤에만 blocking finding을 통과시킵니다.

검증: [[Commercial Readiness Hardening - Rate Limit and Privacy Finding Ownership 2026-05-31#검증 증거]]

## 2026-06-01 Backend public URL resolution safety

> [!success]
> Public URL field가 private/internal host를 legacy IP literal, embedded IPv6, DNS private resolution으로 우회 저장하지 못하도록 보강했습니다.

계약:

- `localhost`, `.localhost`, `.local`, non-global IP literal은 계속 reject합니다.
- `2130706433`, `0x7f000001`, `017700000001`, `127.1` 같은 legacy IPv4 literal은 reject합니다.
- IPv4-mapped IPv6, 6to4, Teredo, NAT64 embedded IPv4가 non-public이면 reject합니다.
- hostname DNS가 private/link-local/non-global address를 반환하면 reject합니다.
- DNS lookup 실패는 storage-time availability를 위해 기존 hostname validation으로 fallback합니다.

검증: [[Commercial Readiness Hardening - Backend Public URL Resolution Safety 2026-06-01#검증 증거]]

## 2026-06-01 Backend publish-time client scan rescan

> [!success]
> Client-supplied privacy scan JSON is no longer a terminal trust boundary for public/unlisted publish.

계약:

- Ingested scan JSON is labeled `source: client`.
- Publish trusts only `source: server_publish_fallback` as a terminal server-verified scan.
- A client `safe` scan with no findings still receives server fallback scanning before public/unlisted publish.

검증: [[Commercial Readiness Hardening - CLI Diagnostics Backend Privacy Rescan and Feed Backdrop 2026-06-01#검증 증거]]

## 2026-06-02 Backend publish privacy ignore and fallback taxonomy

> [!success]
> Blocking privacy finding은 더 이상 `ignored` resolution으로 public/unlisted publish를 통과할 수 없습니다.

계약:

- `high` / `critical` / unknown severity는 `redacted` 또는 `removed`일 때만 publish-resolved입니다.
- 기존 데이터에 `resolved=true`, `resolution=ignored`가 남아 있어도 publish gate는 차단합니다.
- Server fallback scanner는 email, env/config file reference, sensitive local path를 public fields 전반에서 차단합니다.

검증: [[Commercial Readiness Hardening - Backend Publish Privacy Identity Defaults 2026-06-02#검증 증거]]

## 2026-06-02 Frontend stale review and one-time token safety

> [!success]
> Review publish 직전 최신 privacy review를 재조회하고, one-time token copy 성공 즉시 secret state를 제거합니다.

계약:

- Review page는 stale in-memory finding 상태만 믿고 publish하지 않습니다.
- Fresh review가 unsafe이면 publish mutation을 보내지 않습니다.
- Settings one-time token은 clipboard 성공 후 UI/state에서 즉시 사라집니다.

검증: [[Commercial Readiness Hardening - Frontend Review Feed Token Safety 2026-06-02#검증 증거]]
