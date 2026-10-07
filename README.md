# Quiztiary

Anonymous questions for live online sessions, with a panel for the host and pixel-art badges for whoever asks.

Participants open a link (or scan the QR), write a question and instantly win a 16×16 pixel-art badge for their collection. The host sees the questions on a password-protected panel and marks them as answered; participants see that update live. Nobody, including the host, can tell who asked what.

It is a customizable platform born from preguntario: same spirit and design, with every fixed choice turned into a setting.

## Quick start

```bash
npm install
cp .env.example .env          # set PANEL_PASSWORD
npm run build && npm start    # http://localhost:4321, panel at /panel
npm run tunnel                # second terminal: public URL through Cloudflare
```

Or let Claude Code do it: open the project and ask to set up Quiztiary. The `quiztiary-setup` skill asks you everything (each question has a default), writes the config and checks that it all works.

## What you can customize

Everything lives in [`quiztiary.config.mjs`](quiztiary.config.mjs); secrets live in `.env`.

| Setting | Default | Where it plugs in |
|---|---|---|
| `name`, `slug` | Quiztiary | Titles, storage keys, database file |
| `locale` | `en` | One active language from `src/i18n/` (`en`, `es`). New language: one JSON file. |
| `audience` | participants in a live online session | Read by the AI judge |
| `ai` | `random` | How badges are chosen: `src/lib/judges/` |
| `badges` | `animals` | The pixel-art theme: `src/badges/themes/` (`animals`, `space`) |
| `releaseDelay` | `[20, 90]` | Seconds before a question reaches the panel, so timing does not reveal its author |
| `publicUrl` | `cloudflare` | Where the panel QR points: `src/lib/public-url.ts` |
| `colors` | accent `#d9542b`, gold `#e0a800` | Interface and favicon |

### Badges

Badges are pixel art written as text: 16 rows of 16 characters, one character per palette colour. Every theme gets the same game mechanics: three rarities (common, shiny, legendary with a pixel aura) and two accessories (a crown when many people share the doubt, a bounce when the question brings a concrete case). A theme only decides the subjects.

Each badge has a `hint`: the kind of question it rewards (why, how, skeptical…). With an AI judge, the hint tilts the odds; with `random`, it still names the kind on screen. Owned badges come out less often, so collections fill up quickly.

`npm run gallery -- <theme>` renders every badge in every variant to `designs/<theme>.html`. The setup skill can draw a whole new theme from a one-line brief.

### Judges (AI or not)

A judge reads the question and returns how well it fits each badge, plus depth, whether many would share it, whether it brings an example, and whether it is spam or not a question. It only tilts the roll: there is always a badge.

- `random`: no AI, no key, no network.
- `jev`: [Jev by TypeSafe AI](https://typesafe.ai). Set `JEV_API_KEY` in `.env`. It also rejects insults, personal data and non-questions.
- Your own: add `src/lib/judges/<name>.ts` exporting `judge` (the contract is documented in `src/lib/judges/index.ts`) and set `ai: '<name>'`. Nothing else changes.

### Reaching participants

The app runs on your computer. `npm run tunnel` opens a free Cloudflare quick tunnel (no account, no open ports) and downloads `cloudflared` the first time; the panel reads the public URL from it for the QR. The URL changes every time the tunnel opens. Quick tunnels do not support Server-Sent Events, so updates use long polling.

To use your own domain, a named tunnel or a deployment, set `PUBLIC_URL` in `.env`. To add another tunnel provider, add a strategy in `src/lib/public-url.ts`.

## Anonymity

- The server stores the question text and its badge. No IP, no browser fingerprint, no cookie.
- Each question reaches the panel after a random delay.
- Collections and "your questions" live only in each participant's browser (`localStorage`).

## Before the event

```bash
npm run reset-db    # with the server stopped: start with no test questions
```

`npm run dev` is for development only; for the session use `build` + `start`.

## Building Quiztiary itself

Quiztiary is built by an agent in a self-improving loop: see the `build-loop` skill (`.claude/skills/build-loop/`). `npm run verify` is the gate every commit passes (a git pre-commit hook enforces it): tool self-checks, badge themes, locales, prize odds, types, build, an HTTP smoke test and a headless Chrome round trip. When something slips past it, the tool is fixed first, and `tools/LOG.md` records why.
