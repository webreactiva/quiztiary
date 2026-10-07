// Everything a host can customize lives in this file. The quiztiary-setup skill writes it for you.
// Secrets never go here: the panel password and AI keys live in .env (see .env.example).
export default {
  // Shown in the page title and headings.
  name: 'Quiztiary',
  // Prefix for the browser storage keys and the database file (<slug>.db). Lowercase, no spaces.
  slug: 'quiztiary',
  // Active language: a file in src/i18n/. Only one is active at a time.
  locale: 'es',
  // Who is asking. The AI judge reads it to understand the questions (in English).
  audience: 'participants in a beginner AI training session',
  // How badges are rolled: a file in src/lib/judges/. 'random' needs no AI; 'jev' needs JEV_API_KEY.
  ai: 'random',
  // Badge theme: a file in src/badges/themes/.
  badges: 'animals',
  // Seconds a question waits, at random within this range, before it reaches the panel.
  // It hides who wrote what from the timing. Raise it for very small groups.
  releaseDelay: [20, 90],
  // Where the panel QR points: 'cloudflare' reads the quick tunnel URL from cloudflared,
  // 'origin' uses the address the panel is opened from. PUBLIC_URL in .env always wins.
  publicUrl: 'cloudflare',
  // Interface colours. Badges keep their own palettes.
  colors: { accent: '#d9542b', gold: '#e0a800' },
};
