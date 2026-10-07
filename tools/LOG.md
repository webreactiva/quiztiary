# Tool log

One line per change to the build tools: what slipped through, what catches it now.

- 2026-10-08 · initial gate: verify, smoke, badges-check, i18n-check, self.check.
- 2026-10-08 · smoke ran as soon as astro.config.mjs existed and crashed on the bare scaffold; it now waits for the API it exercises (src/pages/api/questions.ts).
- 2026-10-08 · a commit went in with verify red because a shell pipe hid the exit code; a pre-commit hook now runs verify on every commit. self.check's good badge fixture also stopped depending on the active locale, and a fixture without names now proves the locale rule.
