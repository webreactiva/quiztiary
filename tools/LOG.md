# Tool log

One line per change to the build tools: what slipped through, what catches it now.

- 2026-10-08 · initial gate: verify, smoke, badges-check, i18n-check, self.check.
- 2026-10-08 · smoke ran as soon as astro.config.mjs existed and crashed on the bare scaffold; it now waits for the API it exercises (src/pages/api/questions.ts).
