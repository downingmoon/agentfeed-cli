---
title: User Avatar Reuse State Guard 2026-06-08
type: task-note
status: done
created: 2026-06-08
updated: 2026-06-08
tags:
  - agentfeed
  - frontend
  - avatar
  - github-profile
  - contract-guard
related:
  - "[[User Avatar Residual Coverage 2026-06-08]]"
  - "[[User Avatar Owner Review Coverage 2026-06-08]]"
---

# User Avatar Reuse State Guard 2026-06-08

## 배경

피드, 검색, 알림, 댓글, 프로젝트 카드처럼 사용자 행을 반복 렌더링하는 영역은 `Avatar` 컴포넌트 인스턴스가 다른 사용자 데이터로 재사용될 수 있다. 기존 구현은 원격 이미지 로드 실패 시 `imageFailed=true`로 initials fallback을 표시했지만, 이후 같은 인스턴스에 다른 GitHub profile image URL이 들어와도 실패 상태가 남을 수 있었다.

> [!bug] 확정된 위험
> 한 사용자의 깨진 avatar URL이 실패한 뒤 리스트 재정렬/페이지네이션/탭 전환 등으로 같은 React 인스턴스가 다른 사용자를 받으면, 새 사용자의 정상 GitHub avatar도 initials로만 보일 수 있다.

## 변경

- Frontend `src/components/ui/Avatar.tsx`
  - `rawAvatarUrl`을 현재 API/adapted avatar URL로 분리했다.
  - `useEffect(..., [rawAvatarUrl])`로 avatar URL이 바뀔 때마다 `imageFailed`를 초기화한다.
  - 같은 URL이 실제로 계속 실패하는 경우에는 기존처럼 initials fallback을 유지한다.
- Frontend `src/lib/page-source-contract.test.ts`
  - Avatar가 URL 변경 시 실패 상태를 초기화해야 한다는 source contract guard를 추가했다.

## 검증

- `npm run test:contracts` ✅
- `npm run lint` ✅
- `AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 NEXT_PUBLIC_API_URL=http://161.33.171.81:18080/v1 npm run build` ✅

## 개인서버 배포 증적

- `make server-up`으로 4개 AgentFeed 디렉터리 sync 및 compose 상태 확인 ✅
- 서버 frontend 컨테이너 강제 재생성: `docker compose --env-file .env up -d --force-recreate frontend` ✅
- 서버 source 반영 확인: `src/components/ui/Avatar.tsx`에 `rawAvatarUrl`, `setImageFailed(false)`, `[rawAvatarUrl]` 존재 ✅
- Frontend: `http://161.33.171.81:13030` HTTP 200 ✅
- Backend ready: `http://161.33.171.81:18080/health/ready` DB connected / migration up-to-date ✅
- Metadata: contract `2026-06-03`, review base `http://161.33.171.81:13030` ✅

## 후행 과제

> [!todo]
> 실제 서버 데이터에서 의도적으로 깨진 avatar URL과 정상 avatar URL이 섞인 사용자 목록을 만들 수 있을 때, `/feed`, `/search`, `/worklogs/:id` 댓글 영역에서 브라우저 시각 회귀를 추가로 확인한다.
