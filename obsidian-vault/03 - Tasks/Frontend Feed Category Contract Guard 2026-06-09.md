---
title: Frontend Feed Category Contract Guard
date: 2026-06-09
status: done
tags:
  - agentfeed
  - frontend
  - contract
  - enterprise-readiness
related:
  - "[[Ingest Enum Metric Bounds Guard 2026-06-09]]"
  - "[[Backend Ingest Strict Contract 2026-06-08]]"
  - "[[Frontend Worklog Card Adapter Fail Closed 2026-06-08]]"
---

# Frontend Feed Category Contract Guard 2026-06-09

## Context

The canonical worklog category set is shared across CLI draft creation, Backend ingest, Backend explore labels, and Frontend feed filtering.

> [!warning] Drift found
> CLI creates drafts with `ai_tool` by default, and Backend canonical categories also include `automation`, `ai_tool`, and `other`. Frontend Feed filters omitted those values, so valid worklogs could appear in the feed without first-class filter labels.

## Changes

### Frontend

- `src/components/pages/FeedPage.tsx`
  - Added missing canonical category filter options: `Automation`, `AI Tool`, `Other`.
  - Aligned `trading` label to `Trading`, matching Backend explore labeling.
  - Extended `CATEGORY_MAP` so URL hydration and API queries round-trip every canonical category slug.
- `src/lib/page-source-contract.test.ts`
  - Added source-contract assertions that Feed exposes/maps every canonical Backend/CLI category.

## Verification

- `npm run test:contracts` passed.
- `npm run lint` passed (`tsc --noEmit`).
- `NEXT_PUBLIC_API_URL=https://api.example.com npm run build` passed.
- `npm run build` without `NEXT_PUBLIC_API_URL` failed closed as expected because production builds require an explicit API URL.

## Follow-up

- Continue scanning for manually duplicated enum lists in Frontend pages.
- Prefer a generated/shared category constant if repeated category surfaces grow, but do not add that abstraction until duplication becomes a proven maintenance risk.
