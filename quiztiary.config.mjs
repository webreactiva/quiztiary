// Everything a host can customize lives in this file. The quiztiary-setup skill writes it for you.
// Secrets never go here: the panel password and AI keys live in .env (see .env.example).
export default {
  // Shown in the page title and headings.
  name: 'Quiztiary',
  // Prefix for the browser storage keys and the database file (<slug>.db). Lowercase, no spaces.
  slug: 'quiztiary',
  // Active language: a file in src/i18n/. Only one is active at a time.
  locale: 'en',
  // Who is asking. The AI judge reads it to understand the questions (in English).
  audience: 'participants in a live online session',
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
  // Interface colours. Badges keep their own palettes. `light` and `dark` follow the visitor's
  // system setting; cards stay light in both, so `cardText` is usually the same dark ink.
  colors: {
    accent: '#d9542b', // buttons, links, the favicon
    onAccent: '#ffffff', // text on buttons
    gold: '#e0a800', // shiny and legendary borders
    success: '#1f5c17', // the "answered" tag
    light: { bg: '#f4efe6', text: '#2b2118', muted: '#7a6b5a', card: '#fffaf2', cardText: '#2b2118', line: '#e2d6c3' },
    dark: { bg: '#17140f', text: '#efe6d8', muted: '#a8998a', card: '#fffaf2', cardText: '#2b2118', line: '#3a3127' },
  },
};
