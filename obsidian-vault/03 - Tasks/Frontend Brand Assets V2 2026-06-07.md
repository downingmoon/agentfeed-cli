---
title: Frontend Brand Assets V2 2026-06-07
date: 2026-06-07
tags:
  - agentfeed/frontend
  - brand-assets
  - mainline
status: implemented
repo: agentfeed-frontend
branch: main
aliases:
  - AgentFeed Brand Assets V2
---

# Frontend Brand Assets V2 2026-06-07

Related: [[AgentFeed Current Product Brief]], [[Active Tasks]]

> [!success] Implemented on `agentfeed-frontend/main`
> UI layout/redesign changes were intentionally **not** applied. This pass only upgrades logo/icon/static brand assets and the small shared brand mark used by existing UI surfaces.

## Problem

The previous mainline logo/icon set felt unfinished because it depended on a literal `A` construction. That made the product look like a placeholder rather than a product with a clear identity.

Main issues:

- No product metaphor: the mark did not express AgentFeed's role of turning AI-agent work into reviewable, public-safe evidence.
- Poor favicon scalability: text-like/letter-like marks collapse at 16px/32px.
- Inconsistent brand surfaces: favicon, inline logo, OG image, and error pages did not share one asset system.
- Weak platform storytelling: public previews did not clearly communicate Claude/Codex/Gemini worklog collection and verification.

## Brand concept

`verified-worklog-stream`

AI agent session traces flow into a verified public-safe ledger seal.

- Left signal lanes = multi-agent activity streams.
- Nodes = sessions/tool work/events being collected.
- Ledger/seal polygon = durable public-safe evidence.
- Check = reviewed/verified publish readiness.

## Changed assets

Generated from `scripts/generate-brand-assets.py`:

- `public/brand/agentfeed-mark.svg`
- `public/brand/agentfeed-lockup.svg`
- `public/brand/agentfeed-banner.svg`
- `public/icon.svg`
- `public/favicon.svg`
- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/apple-touch-icon.png`
- `public/opengraph-image.svg`
- `public/opengraph-image.png`

## Code surfaces updated

- `src/components/ui/Icon.tsx`
  - Replaced old `A` mark with a compact inline `verified-worklog-stream` symbol.
- `src/app/error.tsx`
- `src/app/global-error.tsx`
  - Removed literal `A` fallback and reused shared logo icon.
- `src/app/globals.css`
  - Retuned `.brand-mark` tile styling to match the enterprise dark/gold brand asset direction.
- `src/lib/page-source-contract.test.ts`
  - Added contract checks preventing regression to literal `A` placeholder assets.

## Verification evidence

- `npm run lint` ✅
- `npm test` ✅
- `AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 NEXT_PUBLIC_API_URL=https://api.example.com/v1 NEXT_PUBLIC_REVIEW_BASE_URL=https://example.com npm run build` ✅
- `npm audit --omit=dev --audit-level=moderate` ✅ `0 vulnerabilities`
- Visual file inspection ✅
  - `public/icon-512.png`
  - `public/favicon-32x32.png`
  - `public/opengraph-image.png`
- Local static smoke on `http://localhost:3032` ✅
  - `/` returned 200 and included favicon/OG metadata.
  - `/favicon.ico`, `/brand/agentfeed-mark.svg`, `/opengraph-image.png` returned 200.
  - Local dev process was stopped; no residual `next dev` / `next start` process remained.

> [!note] Future direction
> If the brand mark needs another polish pass, keep the existing UI unchanged and iterate only on the generator + generated assets. Do not merge broad redesign branch styling into `main` without explicit visual approval.
