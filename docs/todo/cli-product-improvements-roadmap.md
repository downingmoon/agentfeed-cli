# AgentFeed CLI 개선 로드맵

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
- `doctor`에 known session files, plugin metadata, hook 상태, API 상태 추가
- `collection_quality: low`일 때 원인과 개선 명령어 안내
- broken hook/config 자동 복구는 opt-in으로 제한

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

- idle gap 기반 자동 세션 분할
- 동일 `session_id + git head_commit` 중복 draft guard
- Claude/Gemini 파서에 대한 window edge case 보강 테스트
- cursor 저장 정책 UX 확정: dry-run, failed upload, manual publish 후 처리
