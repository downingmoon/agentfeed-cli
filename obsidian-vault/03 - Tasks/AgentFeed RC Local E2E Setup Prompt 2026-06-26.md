---
title: AgentFeed RC Local E2E Setup Prompt 2026-06-26
aliases:
  - AgentFeed local E2E prompt
  - AgentFeed RC checklist
status: active
tags:
  - agentfeed/qa
  - agentfeed/cli
  - project/tasks
updated: 2026-06-26
---

# AgentFeed RC Local E2E Setup Prompt 2026-06-26

## 목적

다른 PC/macOS에서 최신 AgentFeed CLI를 설치/링크하고 현재 개발서버 `trading-bot`에 붙여 login → collect → publish → review URL까지 실제 사용자 플로우를 검수한다.

## 다른 로컬 에이전트에게 줄 프롬프트

```text
AgentFeed 로컬 검수 환경을 세팅하고 CLI E2E를 실행해줘.

목표:
- 최신 agentfeed-cli를 로컬에 설치/링크
- 개발 서버 API/Frontend에 연결
- login → collect → publish → open/review URL 확인까지 실제 플로우 검증
- 실패 로그와 재현 명령 정리

서버:
- Frontend: http://161.33.171.81:13030
- API: http://161.33.171.81:18080/v1
- 개발 서버가 HTTP라 CLI 실행 시 필요하면:
  AGENTFEED_ALLOW_INSECURE_API=1

요구:
1. 기존 global agentfeed 링크/설치 상태 확인
2. 최신 repo pull 후 의존성 설치/build
3. `agentfeed --version`, `agentfeed doctor` 실행
4. `agentfeed login` 실행, 브라우저/OAuth/토큰 저장 확인
5. 테스트용 git repo에서 `agentfeed init`, `agentfeed collect --explain`, `agentfeed publish --yes` 실행
6. publish 결과 review URL 열기
7. macOS keychain/token 저장 오류, `AGENTFEED_TOKEN`, ingestion token 401 여부 확인
8. 성공/실패 결과를 명령어와 출력 핵심만 요약

주의:
- production 계정/민감 토큰 출력하지 말 것.
- 실패 시 임시 workaround 하지 말고 원인/명령/로그를 보고.
```

## 수동 체크리스트

- [ ] `node --version` 확인. Node 20+ 권장.
- [ ] `git pull` 후 `npm ci`.
- [ ] `npm run build`.
- [ ] 기존 global binary 위치 확인: `which agentfeed`, `agentfeed --version`.
- [ ] 링크 충돌 시 기존 링크/설치 상태 기록 후 새 CLI가 실행되는지 확인.
- [ ] `AGENTFEED_ALLOW_INSECURE_API=1` 설정.
- [ ] hosted API/frontend override가 dev server를 가리키는지 확인.
- [ ] `agentfeed doctor` 통과/실패 기록.
- [ ] `agentfeed login` 후 토큰 저장 backend 확인.
- [ ] `echo "$AGENTFEED_TOKEN"`는 비어 있어도 정상일 수 있음. CLI가 OS keychain/config file에 저장하면 env var 출력 안 됨.
- [ ] `agentfeed publish --yes`에서 `INGESTION_TOKEN_INVALID` 재현 여부 확인.
- [ ] review URL 접속, worklog 표시 확인.
- [ ] 실패하면 명령, exit code, 핵심 출력, OS, Node/npm, CLI commit/version 기록.

## Known caveats

- macOS keychain 오류: `password data for new item` 이후 `OS keychain credential storage failed`가 날 수 있음. 이 경우 fallback 저장소 동작 여부가 핵심이다.
- 개발서버는 HTTP IP라 CLI 보안 가드 때문에 `AGENTFEED_ALLOW_INSECURE_API=1` 필요할 수 있다.
- 현재 Codex/배포 서버 canonical name은 `trading-bot`; 여기서는 `trading-bot`으로 SSH하지 않는다.
