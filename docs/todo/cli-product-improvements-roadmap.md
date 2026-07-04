# AgentFeed CLI 개선 로드맵

> [!IMPORTANT]
> Historical CLI improvement roadmap입니다. 완료된 수집/공유/진단 hardening은 Obsidian `Commercial Readiness Completed Summary 2026-06-04.md`에 통합됐고, 최신 남은 작업은 Obsidian `Active Tasks.md` / `Human Action Checklist.md`를 기준으로 합니다.


작성일: 2026-05-22
근거: Claude/Gemini 외부 자문 아티팩트(`.omx/artifacts/*agentfeed-cli-advice-20260522-004538.md`)와 현재 CLI 구현 상태.

## 목표

AgentFeed CLI를 단순 수집 도구가 아니라, 로컬 AI 에이전트 작업을 안전한 공개 피드 초안으로 바꾸는 "딸깍 공유" 게이트웨이로 만든다.

## 우선순위

### P0. 수집 정확도 / 세션 슬라이싱

긴 agent session 전체가 한 작업으로 묶여 token/tool call/command 수가 과대 집계되는 문제를 줄인다.

- `last_collected_at` 또는 session cursor 저장
- `collect --since`, `--until`, `--force` 지원
- agent log timestamp 기반 필터링
- idle gap 기반 자동 session boundary 감지
- `collect --explain`에 수집 기간과 source별 근거 표시
- 동일 session/git head 기반 중복 draft guard

### P1. `agentfeed share` 원샷 공유 UX

작업 직후 `agentfeed share` 하나로 collect → local preview → private review upload까지 끝나게 한다.

- 새 명령어: `agentfeed share`
- 지원 옵션:
  - `--dry` / `--dry-run`: 업로드 없이 수집 + 공개 프리뷰만 표시
  - `--open-review`: 업로드 후 review URL 브라우저 오픈
  - `--json`: 자동화용 JSON 출력
  - 기존 collect 계열 옵션 재사용: `--source`, `--session-file`
- publish 전 터미널 프리뷰:
  - project / title / summary
  - agent / model
  - metrics row
  - changed areas
  - privacy scan status / finding count
  - collection quality / sources
- 업로드 결과:
  - private review URL 명확히 출력
  - local draft upload metadata 저장

### P2. 온보딩 / 진단 강화

사용자가 왜 수집이 안 되는지 또는 품질이 낮은지 스스로 알 수 있게 한다.

- `init`에서 Claude/Codex/Gemini/OMC/OMX/Superpowers 흔적 자동 감지
- `doctor`에 known session files, plugin metadata, API 상태 추가
- [x] `collection_quality: low`/`unknown`일 때 원인과 개선 명령어 안내

### P3. 공개 품질 / 안전성 개선

피드로 올라가는 내용이 더 보기 좋고 안전하도록 다듬는다.

- 제목 자동 생성 개선
- `share --note`로 사용자가 짧은 공개 메모 추가
- tag 지원
- redaction dry-run 상세 표시
- TUI rich preview 검토
- backend-provided dynamic privacy rules 검토
- opt-in post-commit draft collection 검토

## 현재 착수 범위

이번 작업은 **P1 `agentfeed share` 원샷 공유 UX**에 집중한다. P0 세션 슬라이싱은 별도 작업으로 남긴다.

## 2026-05-22 P1 진행 상태

완료:

- `agentfeed share` 명령어 추가
- `share --dry` / `--dry-run` 지원
- `share --open-review` 지원
- `share --json` 지원
- `share --source`, `share --session-file` 지원
- private review upload 전 터미널 프리뷰 추가
- 기존 `collect` / `preview` metrics row와 share preview formatter 공통화
- README 사용법 추가

남은 P1 후보:

- review URL 클립보드 복사
- `share --note` 공개 메모 입력
- interactive 확인 프롬프트가 필요한지 제품 UX 결정


## 2026-05-22 P0 진행 상태

완료:

- agent session parser에 `since` / `until` collection window 필터 추가
- Codex window 필터 테스트 추가: 오래된 token/file edit이 제외되고 session id는 유지됨
- `LocalDraft.source.collection_window`에 실제 수집 범위 저장
- `collect --explain`에 collection window 표시
- `.agentfeed/state.json` 기반 last collection cursor 추가
- 기본 collect/share는 저장된 cursor 이후만 수집, `--all` / `--force`로 전체 재수집 가능
- `collect --since`, `collect --until`, `share --since`, `share --until` 지원

남은 P0 후보:

- 동일 `session_id + git head_commit` 중복 draft guard
- Claude/Gemini 파서에 대한 window edge case 보강 테스트
- cursor 저장 정책 UX 확정: dry-run, failed upload, manual publish 후 처리

## 2026-05-23 Claude/Gemini 협업 후속 정리

외부 자문 공통 결론:

- 큰 기능보다 먼저 collection window와 cursor 저장 정책의 안전망을 더 촘촘히 해야 한다.
- Claude/Gemini parser에도 window edge case 회귀 테스트가 필요하다.
- `doctor` / `init` 자동 감지가 다음 고레버리지 작업이다.
- `share --note`, 중복 draft guard, review URL clipboard는 그 다음 UX 후보이다.
- idle-gap 자동 분할, TUI rich preview, dynamic privacy rule, post-commit hook은 아직 이르다.

이번 후속 처리:

- Claude/Gemini collection window boundary 테스트 추가
- sensitive path redaction이 문자열 맨 앞에 불필요한 공백을 넣는 문제 수정
- `share` 수집 경로가 raw `--since` / `--until` 대신 정규화된 collection window를 사용하도록 정리

다음 추천 작업:

1. `doctor`에 세션 파일 / OMC / OMX / Superpowers 감지 결과 추가
2. `init`에서 사용 중인 에이전트 자동 enable
3. 동일 `session_id + git head_commit + collection_window` 중복 draft guard
4. `share --note` 공개 메모 지원
5. review URL clipboard 복사


## 2026-05-23 후속 구현 상태

완료:

- `doctor`에 Claude Code / Codex CLI / Gemini CLI / OMC / OMX / Superpowers signal 출력 추가
- `init`에서 감지된 Codex/Gemini agent 자동 enable
- `session_id + git head_commit + collection_window` 기반 중복 draft guard 추가
- `--force` / `--all`로 중복 guard 우회 가능
- `share --note <text>` 추가: note는 summary에 공개-safe prefix로 들어가며 privacy scanner를 통과한다
- `share` / `publish` 성공 후 review URL clipboard 복사 시도
- `--no-clipboard` / `--no-clip` opt-out 추가
- clipboard unavailable/headless 환경에서 graceful fail 처리

남은 후보:

- `share --note`를 backend 별도 필드로 승격할지 API 계약 검토
- clipboard command Linux fallback(`wl-copy`, `xsel`) 보강

## 2026-05-24 후속 구현 상태

완료:

- Backend `GET /v1/ingest/status` 추가: ingestion token을 검증하되 draft 업로드는 하지 않는 health endpoint
- CLI `agentfeed doctor`가 `/health` API reachability와 `/v1/ingest/status` token validity를 출력
- API/token check helper 테스트와 backend route contract 테스트 추가
- `collect` / `share`가 fingerprint 일치 draft 재사용 여부를 명확히 출력
- 이미 업로드된 local draft는 `publish` / `share`에서 다시 업로드하지 않고 기존 review URL을 재사용
- Backend ingest도 `collection_fingerprint` / `local_draft_id` 중복 요청에 대해 기존 review URL을 반환하여 remote 중복 worklog 생성을 방지
- Backend `worklogs.source_identity_hash`와 active-row partial unique index로 병렬 업로드 race의 중복 생성 리스크를 DB 레벨에서 축소

## 2026-05-29 후속 구현 상태

완료:

- `share` preview가 수집 품질을 항상 표시하고, evidence가 없으면 `Collection sources: none`으로 명확히 표시
- `collect --explain` / `share`가 `collection_quality: low` 또는 `unknown`일 때 `agentfeed doctor`와 `--session-file` 재시도 안내를 출력
- agent session evidence가 없을 때 git diff 중심 draft일 수 있음을 터미널에서 직접 경고
- Claude Code `Bash` tool_result 실패를 수집해 `failed_commands` / `tests_passed` 지표에 반영
- agent session을 못 찾은 git-only 수집도 `git head + collection window + changed files` fingerprint로 중복 draft를 재사용
- `.agentfeed/` 내부 draft/config 산출물이 다음 수집의 git metrics/fingerprint를 오염시키지 않도록 제외
- generic plugin metadata(`.ai`, `.agent`, `.agents`, `.aider`)도 timestamp가 있으면 `--since` / `--until` collection window로 필터링
- `agentfeed collect --json` 자동화 경로도 일반 collect와 동일하게 collection cursor를 저장
- Claude/Codex/Gemini session file이 발견돼도 collection window 안 row가 없으면 high-quality evidence로 취급하지 않음
- Codex 누적 `token_count`는 `--since` 직전 baseline을 빼서 collection window 안 token delta로 집계
- Gemini session duration은 `--since` / `--until` collection window 경계로 clamp해서 이전 작업 시간이 섞이지 않도록 집계
- windowed Codex 수집에서는 cumulative `.omx/metrics.json` token 총합이 세션 row 기반 delta를 덮어쓰지 못하게 차단
- 명시적 `--since` / `--until`이 없을 때 Claude/Codex/Gemini session file의 30분 초과 idle gap 이후 최신 segment만 자동 수집하고 inferred `collection_window`를 draft source/fingerprint에 저장
- CLI 기본 수집 경로처럼 `until=now`만 있는 window에서도 idle-gap inferred `since`를 적용하고, explain/share preview에 `auto-sliced after idle gap` 원인을 표시
- macOS `/var` ↔ `/private/var`처럼 agent log path와 현재 cwd가 symlink 표현만 다를 때도 파일 변경 경로가 누락되지 않도록 project path canonicalization 적용
- `collection_window_reason=idle_gap`을 CLI upload payload → Backend source JSON/schema → Frontend review evidence까지 보존해 사용자가 자동 분할 근거를 확인할 수 있게 함
- git dirty diff와 agent session 변경 파일이 동시에 존재해도 한쪽이 덮어써지지 않도록 changed file evidence를 병합하고, session file 자체는 git evidence에서 제외
- session 기반 duplicate fingerprint에도 normalized changed file evidence를 포함해 같은 session/window라도 dirty diff가 달라진 draft를 stale 재사용하지 않도록 보강
- `collection.include_file_stats=false` 설정을 실제 draft metrics/upload payload/summary/share preview에 반영해 파일 수·라인 수를 0처럼 오해되게 노출하지 않도록 수정
- 자동 source 선택이 `.agentfeed/config.json`의 `agents.*.enabled`를 존중하도록 수정하고, 명시적 `--source`는 비활성 agent도 수동 override로 사용할 수 있게 유지
- `collection.run_tests_on_collect=true`일 때 configured/auto test/build command를 120초 timeout으로 실행해 `tests_run` / `tests_passed` / `commands_run` / `failed_commands` metrics에 반영하고 raw test/build output은 draft/upload payload에 보존하지 않도록 수정

## 2026-05-30 후속 구현 상태

완료:

- `cursor` source가 project-local `.cursor` JSON/JSONL/log metadata 또는 명시적 `--session-file`을 generic evidence로 파싱해 tokens/commands/tool calls/agent turns/modes/changed files를 draft metrics에 반영
- Cursor/generic metadata는 공식 transcript parser가 아니므로 `collection_quality=low`, `collection_sources=[{ type: "generic_metadata", name: "cursor" }]`로 보수적으로 표시
- `.cursor`, `.claude`, `.codex`, `.gemini`, `.omc`, `.omx`, `.ai`, `.agent`, `.agents`, `.aider` 같은 agent/plugin metadata 산출물이 git changed file metrics/fingerprint를 오염시키지 않도록 제외
- agent session file이 `.agentfeed`, `.omx`, `.cursor` 같은 metadata path를 changed_files로 보고해도 public changed-file evidence와 collection fingerprint에서 제외되도록 공통 path filter로 보강
- source metadata가 명시적인 USD cost(`estimated_cost_usd`, `cost_usd` 등)를 제공하는 경우에만 수집하고, `.agentfeed/config.json`의 `collection.include_estimated_cost=true`일 때만 draft/upload metrics에 노출하도록 보강
