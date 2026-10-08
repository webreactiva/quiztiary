# Quiztiary

Anonymous questions for live online sessions, with a host panel and pixel-art badges. Astro (server output, Node adapter), Node 24 (`node:sqlite`, native WebSocket), no framework on the client.

## Map

| Path | What lives there |
|---|---|
| `quiztiary.config.mjs` | Every host choice. Shipped to the browser: never put secrets here. |
| `.env` | Secrets and per-machine overrides (see `.env.example`). |
| `src/i18n/<locale>.json` | All user-facing text. One locale active. Use `t('key')`, never literals. |
| `src/badges/render.mjs` | Badge engine: rarities, crown, bounce, aura. Knows no theme. |
| `src/badges/themes/*.mjs` | Badge themes: 16×16 pixel art as text. The only place badge ids appear. |
| `src/lib/judges/*.ts` | How badges are chosen (`random`, `jev`, `clef`). The only place AI SDKs are imported. Contract in `index.ts`. |
| `src/lib/assign.ts` | Prize roll: the judge tilts, never decides. |
| `src/lib/db.ts` | SQLite, random ids, release delay, long polling. Stores no participant data. |
| `src/lib/public-url.ts` | Where the panel QR points: `PUBLIC_URL`, then strategies. |
| `src/pages/` | Participant page, panel, API. |
| `tools/` | The agent's build tools (below). Not used by hosts. |

## The gate

`npm run verify` must be green before every commit; a git pre-commit hook enforces it. Steps: `tools` (the checkers reject known-bad fixtures), `badges`, `i18n` (keys, placeholders, no literal text in pages), `boundaries` (badge ids only in themes, AI SDKs only in judges, no hex colours in pages or styles), `setup` (the setup skill's apply script round-trips the config), `checks` (every `src/**/*.check.ts`: fair odds for every theme, judge filter resolution), `types`, `build`, `smoke` (HTTP flow, anonymity, limits, no secrets in the client bundle), `ui` (headless Chrome round trip, no third-party requests, markup rendered as text).

Run one step with `npm run verify <step>`.

## Working loop

1. Take the next item, make the smallest change that does it.
2. `npm run verify`. Red: fix the code, never weaken a check.
3. If something broke that verify stayed green on, fix the tool first: add the rule, add a failing fixture to `tools/self.check.mjs`, commit it alone as `feat(tools)` / `fix(tools)`, and add one line to `tools/LOG.md`.
4. Commit the change.

Claude Code specifics (hooks, subagents `pixel-artist`, `reviewer`, `tool-smith`, skills `build-loop` and `quiztiary-setup`) live in `.claude/`.

## Rules

- Anonymity first: no IP, user agent, cookie or timestamp tied to a participant; no request to a third party from any page; ids stay random.
- No host choice hardcoded outside the config, a locale file or a theme: that includes text (use `t()`) and colours (use the palette variables).
- Participant text is length-checked on the server and rendered with `textContent`.
- Commits: Conventional Commits in English, long body explaining why, one concern each, no AI attribution trailer.
