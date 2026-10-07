---
name: quiztiary-setup
description: Interviews the host and customizes their Quiztiary instance (anonymous questions with pixel-art badges for live online sessions) — event name, language, audience, AI judge (none, Jev, or another provider), badge theme (bundled or a brand-new pixel-art theme drawn on request), anonymity delay, public URL, colours and panel password — then writes quiztiary.config.mjs and .env and proves it works. Use whenever someone wants to set up, configure, personalize, rebrand, translate or re-theme Quiztiary, prepare it for an event or class, change its badges, language or AI, or says "configura quiztiary", "personaliza", "set up quiztiary", "/quiztiary-setup", even if they only mention one of these things.
---

# Quiztiary setup

You are setting up Quiztiary for a host: someone running a live online session (a class, a meetup, a webinar) who wants participants to ask questions anonymously, see them on a panel, and collect pixel-art badges. Hosts may not be developers. Ask in their language, keep jargon out, and never make them edit files by hand.

Every question has a default. A host who answers "defaults" to everything must end up with a working instance, so offer the default first and move on fast. Only dig deeper when they pick something custom.

## 1. Read the current state

Read `quiztiary.config.mjs` (current values are the defaults you offer, not the factory ones: they may be re-running setup), list `src/i18n/*.json`, `src/badges/themes/*.mjs` and `src/lib/judges/*.ts`, and check whether `.env` exists and has `PANEL_PASSWORD`.

## 2. Interview

Use AskUserQuestion, up to four questions per call, so it takes two or three rounds. Put the default first and mark it "(Recommended)". The tool adds an "Other" option for free text, so there is no need to add one.

Round 1, the event:

| Question | Default | Notes |
|---|---|---|
| Event name (title and headings) | current `name` | Offer the current name and one name inferred from anything they told you. |
| Language of the interface | current `locale` | List the locales that exist. Another language is possible: see "New language". |
| Who is asking? | current `audience` | One English line the AI judge reads, e.g. "students in an intro to Python course". Translate if they answer in another language. |
| Panel password | generate one | Default: generate a random 4-word or 16-char password and show it once. Never put it in the config. |

Round 2, the game:

| Question | Default | Notes |
|---|---|---|
| Badge theme | current `badges` | List bundled themes with their badge names. "Draw a new theme" is a real option: see "New theme". |
| How badges are chosen | `random` | `random`: pure chance, no AI, no key. `jev`: an AI reads each question and tilts the odds (it also filters spam and non-questions); needs a free key from https://console.typesafe.ai/keys. Another AI: see "Another AI". |
| Anonymity delay | `[20, 90]` | Seconds before a question reaches the panel, so timing does not reveal the author. Fewer than 8 people → suggest `[30, 120]`. |

Round 3, reach and look (skip what the host does not care about by accepting defaults):

| Question | Default | Notes |
|---|---|---|
| How participants reach it | Cloudflare quick tunnel (`cloudflare`) | Runs on their computer, free, no account; the URL changes every time the tunnel opens. Their own URL (domain, deploy, named tunnel) → `publicUrl: 'origin'` plus `PUBLIC_URL` in `.env`. |
| Accent colour | current `colors.accent` | Accept a hex code or a colour name (convert it). Keep enough contrast with white text: buttons are white on accent. |

## 3. Custom paths (only when chosen)

### New theme

Badges are always 16×16 pixel art on the engine's canvas, with the same three rarities and two accessories. Only the subject changes.

1. Ask for the subject (e.g. "kitchen utensils", "our team's mascots") and how many badges (default 7, range 4–8).
2. Each badge needs a distinct **kind of question** it rewards; the AI judge chooses between them, and with `random` they still name the kinds on screen. Start from the bundled kinds (why / how / skeptical / connects to their job / curious tangent / basic question / what if) and pair each with a subject the host likes. Show the pairing and let them adjust.
3. Draw it following `.claude/agents/pixel-artist.md`. Delegate to the `pixel-artist` subagent when it is available; otherwise follow that file yourself. Names and kinds go in the active locale, and in English too when the active locale is not English.
4. `node tools/badges-check.mjs src/badges/themes/<id>.mjs` until it passes, then `npm run gallery -- <id>` and look at the result (render an SVG to PNG with `qlmanage -t` on macOS if you cannot open HTML). Fix anything that reads badly before showing the host.

### New language

1. Copy `src/i18n/en.json` to `src/i18n/<code>.json` and translate every value, keeping keys and `{placeholders}` exactly.
2. Add `text.<code>` with `name` and `kind` to every badge in the chosen theme.
3. `node tools/i18n-check.mjs` and `node tools/badges-check.mjs` must pass.

### Another AI

A judge is one file, `src/lib/judges/<name>.ts`, exporting `judge` with the contract documented at the top of `src/lib/judges/index.ts` (probabilities per badge id from each badge's `hint`, plus depth, everyone, example and unsafe in 0–1, or `null` to fall back to chance). Use `jev.ts` as the model: read the key from `process.env`, import the SDK lazily, catch every error and return `null`. Ask which provider and model, write the file, add the key name to `.env.example` and the key itself to `.env` only if the host pastes it.

## 4. Apply

Write everything through the bundled script, which validates the answers and rewrites the config with its comments:

```bash
node .claude/skills/quiztiary-setup/scripts/apply.mjs '{"name":"Python 101 Q&A","slug":"python-101","locale":"es","audience":"students in an intro to Python course","ai":"random","badges":"animals","releaseDelay":[20,90],"publicUrl":"cloudflare","colors":{"accent":"#2b7bd9"},"env":{"PANEL_PASSWORD":"…"}}'
```

Omitted fields keep their current value. `slug` is the name in lowercase with dashes. `env` keys are merged into `.env` (created from `.env.example` if missing). If the script reports errors, fix the answer or create the missing file, then run it again.

Then run `npm install` if `node_modules` is missing, and `npm run verify`. It builds the app, walks the whole flow over HTTP and drives the real pages in headless Chrome, in the configured language and theme. If it fails, fix the cause; do not hand over a red instance.

## 5. Hand over

Reply in the host's language with:

- A short summary of what was set (name, language, theme, how badges are chosen, delay, how people reach it).
- The panel password, once.
- How to run the day of the event:
  ```bash
  npm run build && npm start   # the app, http://localhost:4321
  npm run tunnel               # in a second terminal, only with the Cloudflare tunnel
  ```
  Then open `http://localhost:4321/panel` and show the QR to participants.
- `npm run reset-db` before the event to start with no test questions (with the server stopped).
- If a new theme was drawn: where the gallery is (`designs/<theme>.html`).

Do not commit unless the host asks; their configuration is theirs to keep or discard. If they ask, use a Conventional Commit in English, e.g. `chore(config): set up for Python 101 Q&A`.
