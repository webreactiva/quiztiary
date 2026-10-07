# Backlog

- [x] Astro + Node scaffold on the preguntario stack
- [x] `quiztiary.config.mjs`: every host choice in one file, secrets stay in `.env`
- [x] Badge engine (`src/badges/render.mjs`) split from theme data (`src/badges/themes/animals.mjs`)
- [x] i18n: `src/i18n/{es,en}.json` + `t()`, one active locale
- [x] Prize roll generic over any theme; `assign.check.ts` derives its thresholds from the theme
- [x] Pluggable judges: `random` (no AI) and `jev`; adding one is one file + one map entry
- [x] Storage with configurable DB path and release delay; long polling as in preguntario
- [x] Public URL strategies: `PUBLIC_URL` env → Cloudflare quick tunnel → request origin
- [x] API routes and pages ported, every string through `t()`
- [x] Badge gallery for any theme
- [ ] A second, small theme to prove themes are swappable
- [ ] `quiztiary-setup` skill (skill-creator) that asks the host everything with defaults
- [ ] README
