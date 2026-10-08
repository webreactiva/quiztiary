# Quiztiary · Anonymous Q&A for meetups, with pixel-art badges

**Break the ice at your meetup: let attendees ask questions and gamify the experience.**

Quiztiary is a free, open-source, self-hosted Q&A tool for live sessions. People scan a QR code, ask anonymously from their phone and win a pixel-art badge for every question. You see the questions on a live panel and mark them answered. No accounts, no app to install, nothing stored about who asked.

> Used in the [Web Reactiva](https://www.webreactiva.com) community to get people asking during live sessions.


https://github.com/user-attachments/assets/781b6d12-8708-486c-b051-cd9afb09bbf2



<details>
<summary><strong>The same idea, in your language</strong></summary>

- **English:** Break the ice at your meetup: let attendees ask questions and gamify the experience.
- **Español:** Rompe el hielo de los asistentes a tu meetup dando la opción de que pregunten y gamificando la experiencia.
- **Português:** Quebre o gelo com os participantes do seu meetup: deixe que façam perguntas e transforme a experiência num jogo.
- **Français :** Brisez la glace avec les participants de votre meetup : laissez-les poser leurs questions et ludifiez l'expérience.
- **Deutsch:** Brich das Eis bei deinem Meetup: Lass die Teilnehmenden Fragen stellen und mach das Erlebnis zum Spiel.

</details>

## Why Quiztiary

In every meetup, Zoom call or workshop, the same thing happens: the speaker asks "any questions?" and the room goes quiet. Not because nobody has one, but because asking in front of everyone feels risky.

Quiztiary removes the risk and adds a reason to ask:

- **Anonymous by design.** Questions arrive with no name and after a random delay, so not even the timing gives the author away.
- **Gamified.** Every question drops a 16×16 pixel-art badge into the attendee's collection, with shiny and legendary variants, crowns and animations. People ask more to complete the set.
- **AI that keeps it clean.** An AI judge ([Jev](https://typesafe.ai) or [Clef on Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/models/clef/)) filters spam, insults and "lol ok" before they reach your screen, and the kind of question asked tilts which badge it earns.
- **Made for the session, not forever.** It runs on your laptop and keeps everything local. When the session ends, so do the questions.

Use it for meetups, online events, Zoom and Google Meet calls, webinars, classes, workshops, conference talks and team all-hands: anywhere you want a live audience Q&A.

## Features

- Anonymous questions from any phone or laptop: open a link or scan a QR code
- Live host panel with QR code, real-time updates and "mark as answered"
- Pixel-art badges with rarities and accessories; bring your own theme
- Optional AI moderation and classification (Jev), or pure chance with no AI at all
- Pluggable judges: add another AI provider with one file
- Multilingual: English and Spanish built in, one active language per session, add more with one JSON file
- Fully themeable: name, palette, light and dark mode, favicon
- Runs locally, public through a free Cloudflare tunnel; deploy anywhere Node runs
- Privacy first: no accounts, no cookies, no IPs stored, no third-party requests from any page
- Set up by your AI agent: a guided skill asks everything, with a default for each answer

## Quick start

Requirements: Node.js 24.

```bash
npm install
cp .env.example .env          # set PANEL_PASSWORD
npm run build && npm start    # http://localhost:4321, panel at /panel
npm run tunnel                # second terminal: a public URL through Cloudflare
```

Open `http://localhost:4321/panel`, enter the password and put the QR code on screen. The QR points to the public tunnel URL automatically.

## Make it yours with your AI agent

Open the project in Claude Code and run **`/quiztiary-setup`**. It is the fastest way to make Quiztiary yours: one conversation, a default for every answer. Using another coding agent? Ask it to set up Quiztiary with the `quiztiary-setup` skill. It asks you about:

- event name and language
- who is asking (so the AI understands the questions)
- how badges are won: chance, Jev, Clef, or another AI, and what the AI should reject
- the badge theme: a bundled one, or **a new pixel-art theme drawn to order** from a one-line brief
- anonymity delay, public URL, colours and panel password

Then it writes the config, draws and validates the badges, and checks that everything works before handing over. Prefer doing it by hand? Everything lives in [`quiztiary.config.mjs`](quiztiary.config.mjs).

## Customization

Host choices live in `quiztiary.config.mjs`; secrets live in `.env`.

| Setting | Default | Where it plugs in |
|---|---|---|
| `name`, `slug` | Quiztiary | Titles, storage keys, database file |
| `locale` | `en` | One active language from `src/i18n/` (`en`, `es`). New language: one JSON file. |
| `audience` | participants in a live online session | Read by the AI judge |
| `ai` | `random` | How badges are chosen: `src/lib/judges/` |
| `filter` | the judge's own | What the AI rejects as not a question: an English prompt and a 0–1 threshold |
| `badges` | `animals` | The pixel-art theme: `src/badges/themes/` (`animals`, `space`) |
| `releaseDelay` | `[20, 90]` | Seconds before a question reaches the panel, so timing does not reveal its author |
| `publicUrl` | `cloudflare` | Where the panel QR points: `src/lib/public-url.ts` |
| `colors` | warm pixel palette | Accent, button text, gold, success, and full `light` / `dark` palettes |

### Badges

Badges are pixel art written as text: 16 rows of 16 characters, one character per palette colour. Every theme gets the same game: three rarities (common, shiny, legendary with a pixel aura) and two accessories (a crown when many people share the doubt, a bounce when the question brings a concrete case). A theme only decides the subjects.

Each badge has a `hint`, the kind of question it rewards (why, how, skeptical…). With an AI judge, the hint tilts the odds; with chance, it still names the kind on screen. Badges you already own come out less often, so collections fill up quickly.

`npm run gallery -- <theme>` renders every badge in every variant to `designs/<theme>.html`.

### Judges and the question filter

A judge reads each question and returns how well it fits each badge, plus depth, whether many people would share it, whether it brings an example, and how well it matches the filter. It only tilts the roll: there is always a badge.

- `random`: no AI, no key, no network, no filter.
- `jev`: [Jev by TypeSafe AI](https://typesafe.ai). Set `JEV_API_KEY` in `.env`.
- `clef`: [Clef by Cloudflare](https://developers.cloudflare.com/workers-ai/models/clef/) on Workers AI, same API as Jev. Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in `.env`; `CLEF_MODEL=clef-flash` picks the faster variant.
- Your own: add `src/lib/judges/<name>.ts` exporting `judge` (and `filter`, its default rejection prompt and threshold). The contract is documented in `src/lib/judges/index.ts`.

The filter decides what gets rejected. Each judge ships wording tuned to its model; override it with `filter.prompt`, e.g. `"The text is not about cooking, food or recipes."` to accept only on-topic questions, or relax it by raising `filter.threshold` toward 1.

### Reaching participants

The app runs on your computer. `npm run tunnel` opens a free Cloudflare quick tunnel (no account, no open ports) and downloads `cloudflared` the first time; the panel reads the public URL from it for the QR. The URL changes every time the tunnel opens. Quick tunnels do not support Server-Sent Events, so live updates use long polling.

To use your own domain, a named tunnel or a cloud deployment, set `PUBLIC_URL` in `.env`. To add another tunnel provider, add a strategy in `src/lib/public-url.ts`.

## Privacy and anonymity

- The server stores the question text and its badge. No IP, no browser fingerprint, no cookie.
- Each question reaches the panel after a random delay, and question ids are random, so neither timing nor order reveals who asked.
- Collections and "your questions" live only in each attendee's browser (`localStorage`).
- Pages make no third-party requests: the pixel font is served by the app, nothing loads from Google or a CDN.
- Before an event, `npm run reset-db` (with the server stopped) starts you with no test questions.

## FAQ

**Is Quiztiary an alternative to Slido or Mentimeter?**
For anonymous audience Q&A, yes: free, open source and self-hosted. It does one thing, live questions, and adds badges to get people asking.

**Do attendees need an account or an app?**
No. They open a link or scan a QR code in the browser.

**Does it work for in-person meetups and online calls?**
Both. Show the panel's QR on the projector or share the link in the Zoom, Meet or Teams chat.

**Can I deploy it in the cloud?**
Yes. It is a Node server (Astro with the Node adapter and SQLite). Set `PUBLIC_URL` and run `npm start` wherever Node 24 runs. It is designed for one session at a time.

**Can I use another AI instead of Jev?**
Yes. A judge is one file with a documented contract, and the setup skill can write it for you.

## How Quiztiary is built

Quiztiary is developed by an AI agent working in a self-improving loop (see [`AGENTS.md`](AGENTS.md) and the `build-loop` skill). `npm run verify` is the gate every commit passes, enforced by a git pre-commit hook: tool self-checks, badge themes, locales, code boundaries, the setup script, unit checks, types, build, an HTTP smoke test and a headless Chrome round trip. When something slips past the gate, the tool is fixed first, and [`tools/LOG.md`](tools/LOG.md) records why.

## License

[MIT](LICENSE). The pixel font, Pixelify Sans, is under the SIL Open Font License 1.1.

## Who's behind it

I'm **Dani Primo**. I've been a web developer for many years, and these days I spend a good part of each day with AI coding agents, figuring out which tools are worth it.

I run [**Web Reactiva**](https://www.webreactiva.com), a Spanish-language home for developers learning to build with AI: a [podcast](https://www.webreactiva.com/podcast) with more than 700 episodes since 2017, a [newsletter](https://www.webreactiva.com/newsletter), [courses](https://www.webreactiva.com/cursos), monthly live masterclasses where we code together, and a premium community.

Quiztiary started as a small tool for one of those live trainings, because the best questions are often the ones nobody dares to ask out loud.
