# Changelog

All notable changes to Claude TTL Counter.

---

## [0.3.0] — 2026-04-21

### Added
- **i18n support (Korean + English)** — tooltip, notification, Quick Pick, status bar now follow system language. Uses VS Code official `package.nls*.json` + `vscode.l10n.t()` pattern
- **Median-based asymmetric recommendation** — replaced average gap with median gap. 5m suggestion only when median < 3min (conservative), 1h suggestion when > 5min (proactive), strong 1h when > 10min. Boundary zone (3–5min) shows no recommendation
- **Strength-graded tooltip tips** — "5m may save tokens" / "1h is safer" / "strongly recommend 1h" instead of generic "switch to X"
- **Session grace period** — no false warnings during the first 2 logical turns after IDE reload or session switch
- **Community evidence section** — Reddit + GeekNews links documenting Anthropic's silent TTL default change

### Changed
- **Logical turn reconstruction** — assistant usage now deduped by requestId/messageId (same logical response no longer counts as multiple cold starts)
- **User prompt filtering** — recommendation input excludes tool_result, meta messages, and interrupt placeholders
- **Health warning separated from recommendation** — warning notification no longer appends mode suggestion
- **Locale-aware number formatting** — tokens and percentages now follow system locale instead of fixed en-US
- **README intro rewritten** — leads with symptom ("daily limit gone?"), explains TTL default (5min silent change), includes TL;DR decision guide
- **Max user prompt sample** increased from 5 to 8 for more stable median calculation
- **Maker bio updated** — product name removed (not yet public), founding builder context expanded

### Fixed
- **False cold start on IDE reload** — multi-part assistant emission (thinking + text) no longer inflates cold start count
- **False "frequent resets" warning** — grace period prevents warning from firing immediately after session switch

---

## [0.2.0] — 2026-04-21

### Added
- **Per-user context size guidance** — "Which TTL mode" section now explains why the answer varies per user (CLAUDE.md, MEMORY.md, MCP, plugins, harness docs affect cache reset cost)
- **Decision rule** — short turn gaps → 5m saves daily usage; long turn gaps → 1h prevents mysterious limit drops
- **Agentic coding tips** — practical lessons on turn cost, agent reading depth, and prompt quality
- **Maker bio** — background story + PurplePrint System description + founding builder network

### Changed
- **Repo renamed** to `save-ur-tokens-ttl-counter-for-claude-code` — value-first naming for discoverability
- All internal repo references updated (install.js REPO constant, package.json URLs, README curl examples)
- README restructured: Background story, cost note, Before/After, Core + UI table, per-project scope guide

### Fixed
- npm installer now points to correct repo for GitHub Releases API

---

## [0.1.0] — 2026-04-21

Initial public release.

### Features
- **TTL countdown** in status bar — real-time display with 5-stage color (green → orange → warning → danger → expired)
- **Cache health monitoring** — tracks cold starts across recent turns
- **Usage tracking** — per-turn cache hit ratio, fresh tokens, total tokens in tooltip
- **Mode recommendation** — warns when turn gaps don't match current TTL, suggests switch
- **Quick Pick toggle** — click status bar to switch between 5m and 1h modes
- **Per-project TTL** — override global setting per workspace

### How it works
- Reads local Claude files only (`~/.claude/sessions/`, `~/.claude/projects/`, `~/.claude/settings.json`)
- Zero network calls, no proxy, no patching of Claude Code extension

### Docs
- Full bilingual README (English + Korean)
- HOW-TO-USE.md with detailed setup guide
- Per-project TTL configuration guide
