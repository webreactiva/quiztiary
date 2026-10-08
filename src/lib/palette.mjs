// Turns `colors` from quiztiary.config.mjs into CSS custom properties: the light palette on
// :root, the dark one when the system prefers it. Pages only ever use the variables.
const vars = (p) =>
  `--bg: ${p.bg}; --fg: ${p.text}; --muted: ${p.muted}; --card: ${p.card}; --card-fg: ${p.cardText}; --line: ${p.line};`;

export const paletteCss = (c) =>
  `:root { ${vars(c.light)} --accent: ${c.accent}; --on-accent: ${c.onAccent}; --gold: ${c.gold}; --success: ${c.success}; }
@media (prefers-color-scheme: dark) { :root { ${vars(c.dark)} } }`;
