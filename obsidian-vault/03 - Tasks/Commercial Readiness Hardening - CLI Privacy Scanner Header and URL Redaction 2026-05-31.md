---
title: Commercial Readiness Hardening - CLI Privacy Scanner Header and URL Redaction 2026-05-31
aliases:
  - CLI privacy scanner header URL redaction
created: 2026-05-31
updated: 2026-05-31
status: implemented
tags:
  - agentfeed/cli
  - agentfeed/privacy
  - agentfeed/commercial-readiness
  - project/task
---

# Commercial Readiness Hardening - CLI Privacy Scanner Header and URL Redaction 2026-05-31

> [!success]
> Public-safe text scanner가 authorization header secret, credentialed URL, IPv6/link-local private URL을 redaction하도록 확장되었습니다.

## 변경 계약

- `Authorization: Bearer ...`, `Authorization: Basic ...`, `Authorization: Token ...` 형태의 secret-bearing header value를 `[REDACTED_SECRET]`으로 치환합니다.
- `https://user:pass@example.com/...` 또는 `http://token@example.com/...` 같은 credentialed public URL은 전체 URL을 `[REDACTED_URL]`로 치환합니다.
- IPv6/private/link-local URL도 private URL로 취급합니다.
  - `http://[::1]:3000/...`
  - `https://[fd00::1]/...`
  - `https://[fe80::1]/...`
  - `http://169.254.169.254/...`

> [!important]
> Scanner는 public draft field에 대한 방어선입니다. Backend publish gate가 있더라도 CLI upload 전 redaction pattern은 보수적으로 유지합니다.

## 변경 파일

- `src/privacy/scan.ts`
- `tests/privacy.test.ts`

## 검증 증거

- RED: `npm test -- --run tests/privacy.test.ts -t "authorization headers|credentialed public URLs|IPv6"`가 9개 신규 케이스 실패.
- GREEN: 같은 targeted command가 9개 신규 케이스 통과.
- `npm run typecheck`
- `npm test -- --run` — 247 passed
- `npm pack --dry-run` — prepack clean/build/typecheck/test passed, package dry-run succeeded

## 관련 영역

- [[Privacy Safety#2026-05-31 Header and URL privacy scanner expansion]]
- [[Active Tasks#P2 후보]]
