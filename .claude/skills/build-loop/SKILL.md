---
name: build-loop
description: The agent's own build loop for Quiztiary. Use when building or changing Quiztiary itself (not when a host customizes it — that is quiztiary-setup). Picks the next backlog item, implements it, gates it with `npm run verify`, and improves the verification tools whenever they let a bug through.
---

# Build loop

These tools are for you, the agent building Quiztiary. Hosts never run them by hand.

| Tool | What it tells you |
|------|-------------------|
| `npm run verify [step…]` | The gate. Steps: `tools`, `badges`, `i18n`, `boundaries`, `checks`, `types`, `build`, `smoke`, `ui`. Stops at the first failure. |
| `tools/smoke.mjs` | Boots `dist/` with a throwaway DB, no AI key, no release delay, and walks ask → badge → panel → answered → status. |
| `tools/ui.mjs` | Drives the real pages in headless Chrome (participant asks, host answers, participant sees it). Fails on script errors and failed requests. Screenshots in `tools/.shots/`: look at them. |
| `tools/lib/browser.mjs` | The tiny CDP driver behind `ui` (`launch`, `goto`, `eval`, `waitFor`, `shot`, `errors`). Use it for one-off checks too. |
| Chrome DevTools MCP | For interactive inspection when a check fails or a screen looks off. |
| `tools/badges-check.mjs [file…]` | Is a badge theme drawable, rollable and named? |
| `tools/i18n-check.mjs` | Same keys and `{placeholders}` in every locale; every `t('key')` exists. |
| `tools/boundaries-check.mjs` | No badge id outside themes, no AI SDK outside judges: the seams stay swappable. |
| `tools/self.check.mjs` | Every checker rejects a known-bad fixture. Guards the guards. |
| `tools/.runs.jsonl` | One line per step per run (ok, ms). Local, not committed. |
| `tools/LOG.md` | Why each tool changed. Read it before touching a tool. |

Wired into Claude Code (`.claude/settings.json`):

- **PostToolUse hook** (`tools/hooks/after-edit.mjs`): after you edit a theme, a locale or a tool, the fast checker for it runs and its failure comes straight back to you.
- **Stop hook** (`tools/hooks/stop.mjs`): you cannot end a turn with uncommitted changes and verify red.
- **git pre-commit** (`.githooks/`): no commit lands with verify red, whatever the shell pipeline does.

Subagents (`.claude/agents/`):

- `pixel-artist`: draws or fixes a badge theme until badges-check passes.
- `reviewer`: reviews the diff against the platform's promises before you commit.
- `tool-smith`: improves the tools when they missed something; commits on its own.

## One iteration

1. Take the first unchecked item in `tools/BACKLOG.md`.
2. Implement the smallest change that does it.
3. `npm run verify`. Red → fix the code, never weaken a check to get green.
   Non-trivial product change → run the `reviewer` agent on the diff.
4. Ask: did something break (in the browser, in a step you ran by hand, in review) that verify stayed green on?
   - Yes → **improve the tool first** (delegate to the `tool-smith` agent, or do it yourself): add the rule to the checker or smoke, add a failing fixture to `tools/self.check.mjs`, run verify, commit it alone as `feat(tools): …`, add one line to `tools/LOG.md` (date, what slipped through, what now catches it).
   - Look at `tools/.runs.jsonl` too: a step that got slow or failed twice for the same reason is also a tool to improve.
5. Tick the backlog item and commit the feature (Conventional Commits, English, long body explaining why, one concern per commit, no AI attribution trailer).
6. Back to 1. Stop when the backlog is empty and verify is green.

## Rules

- A tool change ships with the fixture that proves it fails on bad input.
- Never skip a step with an env var or flag to get a commit through.
- If a check is wrong (rejects valid input), fix the check and say so in `tools/LOG.md`.
