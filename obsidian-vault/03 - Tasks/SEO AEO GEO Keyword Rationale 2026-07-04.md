---
title: SEO AEO GEO Keyword Rationale 2026-07-04
date: 2026-07-04
tags:
  - agentfeed
  - seo
  - aeo
  - geo
  - keyword-strategy
status: active
aliases:
  - AgentFeed SEO keyword rationale
  - AgentFeed AEO GEO keyword rationale
---

# SEO AEO GEO Keyword Rationale 2026-07-04

> [!summary]
> AgentFeed의 paid-ready 검색 전략은 "AI agent worklog"를 중심축으로 잡고, 공개 worklog/profile/project 페이지를 long-tail UGC 검색 자산으로 만든다. 키워드는 매번 1) 제품 적합성, 2) 필수성, 3) 검색엔진 유리성을 통과해야 한다.

## 근거 기준

- Google Search Central은 SEO를 검색엔진이 콘텐츠를 이해하고 사용자가 검색으로 사이트를 찾도록 돕는 작업으로 설명한다. 즉 AgentFeed의 핵심은 crawler가 공개 worklog/profile/project를 이해하게 하는 것이다.
  - Source: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google은 metadata, structured data, alt text까지 accuracy, quality, relevance가 중요하다고 한다. AI 관련 제품이라도 대량 저품질 AI page 생성은 전략이 아니다.
  - Source: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Structured data는 페이지 의미를 명시적으로 설명하고 rich result eligibility를 만든다. AEO에는 visible answer copy + JSON-LD가 함께 필요하다.
  - Source: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Sitemap은 중요한 URL과 업데이트 정보를 검색엔진에 알려 crawl 효율을 높인다. AgentFeed는 public UGC가 계속 생기므로 dynamic sitemap이 맞다.
  - Source: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- `/llms.txt`는 LLM inference-time 이해를 돕기 위한 community proposal이다. Google official ranking signal로 취급하지 않는다.
  - Source: https://llmstxt.org/

## Primary keyword cluster

| Keyword | Language | Fit | Necessity | Search advantage | Decision |
|---|---|---|---|---|---|
| AI worklog | EN | AgentFeed가 수집/공유하는 핵심 산출물과 직접 일치 | 랜딩, worklog detail, `/llms.txt`의 기본 정의어 | 짧고 설명 가능하지만 broad함 | Primary |
| AI agent worklog | EN | Codex/Claude/Cursor/Antigravity 작업 기록이라는 제품 정체성과 가장 정확히 일치 | category ownership용 필수 키워드 | 경쟁이 상대적으로 좁고 intent가 높음 | Primary |
| agent worklog | EN | AI를 생략한 변형 검색 대응 | AI modifier 없는 query 흡수용 | AI worklog보다 덜 명확하지만 long-tail 보완 | Secondary |
| AI coding portfolio | EN | 공개 worklog가 개발자 portfolio evidence가 되는 가치와 일치 | 구매/가입 intent를 설명하는 positioning에 필요 | portfolio query는 intent가 높음 | Primary commercial |
| developer portfolio | EN | 결과물 showcase 관점과 연결 | 너무 넓어서 단독 primary는 부적합 | broad/high competition, title보다는 supporting copy | Supporting |
| build in public | EN | 공개 작업 공유 문화와 일치 | community discovery에 유용하지만 제품 고유성은 약함 | established query라 유입 가능, 차별 문구 필요 | Supporting |

## Agent/tool long-tail cluster

| Keyword | Language | Fit | Necessity | Search advantage | Decision |
|---|---|---|---|---|---|
| Claude Code worklog | EN | supported source와 일치 | Claude Code 사용자 유입에 필요 | tool-specific intent가 강함 | Long-tail primary |
| Codex worklog | EN | supported source와 일치 | Codex 사용자 유입에 필요 | OpenAI/Codex ecosystem intent 흡수 | Long-tail primary |
| Cursor worklog | EN | supported source와 일치 | Cursor 사용자 유입에 필요 | developer-tool search modifier로 유리 | Long-tail primary |
| Antigravity CLI worklog | EN | user-confirmed supported replacement 방향과 일치 | Gemini CLI 종료 흐름 이후 명확한 supported source 표현 | low-competition early ownership 가능 | Long-tail primary |
| Gemini CLI worklog | EN | standalone Gemini CLI는 user-confirmed deprecated/ended direction | primary SEO에 넣으면 제품/현실 mismatch | stale traffic 위험 | Reject primary; legacy mention only if needed |

## Korean keyword cluster

| Keyword | Language | Fit | Necessity | Search advantage | Decision |
|---|---|---|---|---|---|
| AI 작업 로그 | KO | worklog를 자연어로 설명 | 한국어 랜딩/AEO 답변에 필수 | 명확하고 low-noise | Primary |
| AI 에이전트 작업 로그 | KO | 제품 category를 가장 정확히 설명 | AEO 질문 답변용 필수 | 길지만 intent 높음 | Primary |
| AI 개발 포트폴리오 | KO | 공개 worklog의 구매가치와 연결 | 국내 개발자/채용/프로필 intent 대응 | commercial intent 높음 | Primary commercial |
| 에이전트 작업 공유 | KO | social/feed 기능과 연결 | 제품 기능 설명 보조 | query volume은 불확실하나 category seed로 유효 | Secondary |
| 공개 개발 로그 | KO | build-in-public 한국어 대응 | community positioning에 필요 | broad하지만 UGC long-tail과 맞음 | Supporting |

## Rejected or de-emphasized keywords

- `AI tool`, `productivity app`, `developer tool`: 너무 넓고 AgentFeed의 공개 worklog/portfolio 가치가 흐려진다.
- `prompt library`: prompts는 보조 자산일 수 있으나 AgentFeed의 primary object는 worklog다.
- `Gemini CLI worklog`: current public primary SEO에서 제외. 사용자 기준으로 Gemini CLI는 종료/전환 맥락이고 AgentFeed는 Antigravity 중심으로 표기한다.
- Legacy automatic agent integration keywords: deprecated surface. 수집 정확도/현재 제품 전략과 무관하므로 public/docs SEO에서 제외한다.

## Implemented surfaces mapped to keywords

- SEO: public route metadata, canonical, OpenGraph/Twitter, `robots.ts`, dynamic `sitemap.ts`.
- AEO: homepage visible answer copy, FAQ JSON-LD, SoftwareApplication/Organization/WebSite JSON-LD, dynamic detail JSON-LD.
- GEO: `/llms.txt` with concise EN/KO answer snippets, supported-source list, canonical public links, privacy boundary.
- Detail long-tail: public worklog/profile/project metadata from backend; unavailable/private pages fail closed to noindex.

## Paid-ready remaining gates

> [!warning]
> This note documents keyword strategy, not final paid-ready proof.

- Real-browser Lighthouse/PageSpeed evidence for production domain is still needed.
- Google Search Console property/sitemap submission evidence is still needed after production DNS/indexing setup.
- Rich Results validation for homepage/worklog/profile/project JSON-LD is still needed.
- Dynamic project URL sitemap behavior is contract-covered but live API currently has no public project example.
- `/llms.txt` is useful for GEO/LLM consumption, but must not be reported as a Google ranking factor.

## Related

- [[Active Tasks]]
- [[Collection System]]
- [[Integration - CLI Backend Frontend]]
