---
title: Frontend Agent Glyph Assets 2026-06-07
date: 2026-06-07
tags:
  - agentfeed/frontend
  - brand-assets
  - agent-glyphs
status: implemented
repo: agentfeed-frontend
branch: main
aliases:
  - AgentFeed Agent Glyph Assets
---

# Frontend Agent Glyph Assets 2026-06-07

Related: [[Frontend Brand Assets V2 2026-06-07]], [[AgentFeed Current Product Brief]], [[Active Tasks]]

> [!success] Implemented on `agentfeed-frontend/main`
> Replaced text-only agent abbreviations with owned SVG glyphs while preserving the current main UI layout.

## Problem

The Claude Code, Codex, Cursor, and Gemini visual treatment was still MVP-grade after the main AgentFeed mark was improved.

Previous treatment:

- Claude Code: `CL`
- Codex: `CX`
- Cursor: `⌘`
- Gemini CLI: `GM`

These looked like debugging placeholders rather than product-quality logos/icons.

## Decision

Use AgentFeed-owned SVG glyphs instead of copying official vendor marks.

Reasoning:

- Official vendor logos may require current trademark/brand-guideline compliance.
- Product UI needs consistent size, stroke, color, and dark-mode behavior.
- Owned glyphs can communicate each agent category without introducing external logo licensing risk.

## Glyph concepts

- Claude Code: radial reasoning lattice inside a hex tile.
- Codex: compact code terminal/bracket tile.
- Cursor: pointer/navigation tile.
- Gemini CLI: twin sparkle/diamond tile.

## Changed surfaces

- `src/components/ui/AgentGlyph.tsx`
  - New shared SVG glyph component.
- `src/components/ui/AgentBadge.tsx`
  - Uses `AgentGlyph` instead of `{a.icon}` text.
- `src/components/pages/LandingPage.tsx`
  - Supported-agent strip uses `AgentGlyph`.
- `src/lib/data.ts`
- `src/lib/types.ts`
  - Removed text-only `icon` fields.
- `src/app/globals.css`
  - Upgraded `.agent-glyph` styling to a small premium badge tile.
- `scripts/generate-brand-assets.py`
  - Brand banner and OpenGraph image now draw matching agent glyph chips.
- `public/brand/agentfeed-banner.svg`
- `public/opengraph-image.svg`
- `public/opengraph-image.png`
  - Regenerated with glyph chips.
- `src/lib/page-source-contract.test.ts`
  - Locks against returning to text-only `CL/CX/GM/⌘` badges.

## Verification evidence

- `npm test` failed first as expected because existing `CL/CX/GM/⌘` text glyphs violated the new contract.
- `npm run lint` ✅
- `npm test` ✅
- `AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 NEXT_PUBLIC_API_URL=https://api.example.com/v1 NEXT_PUBLIC_REVIEW_BASE_URL=https://example.com npm run build` ✅
- `npm audit --omit=dev --audit-level=moderate` ✅ `0 vulnerabilities`
- Visual file inspection ✅
  - `public/opengraph-image.png`
- Local smoke on `http://localhost:3033` ✅
  - `/` rendered all four `data-agent-glyph` values.
  - `/opengraph-image.png` returned 200.
  - Local dev server was stopped; no residual Next.js process remained.

> [!note] Future direction
> If exact official vendor marks are required later, review each vendor's current trademark/brand rules first and keep them visually separated from AgentFeed-owned product glyphs.
