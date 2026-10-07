// Badge engine: draws any theme's 16×16 pixel art as SVG on a 20×20 canvas, with the three
// rarities and the two accessories. Themes are data (src/badges/themes/); nothing here knows them.

/** Symmetric sprites: write the left 8 columns, get the full 16. */
export const mirror = (half) => half.map((r) => r + [...r].reverse().join(''));

export const RARITIES = ['common', 'shiny', 'legendary'];

// Accessories are game mechanics, shared by every theme. Labels live in src/i18n.
// crown: a layer anchored to each badge's head (its `crownY`). bounce: an animation, no pixels.
export const ACCESSORIES = {
  crown: {
    palette: { y: '#ffcc33', r: '#e0383e' },
    rows: ['....y..yy..y....', '....yy.yy.yy....', '....yyyrryyy....'],
  },
  bounce: {},
};

// Legendary background: a pixel aura in rings, gold to violet.
const AURA_BANDS = [[4, '#fff4c2'], [6, '#ffd75e'], [8, '#f5a623'], [10, '#d9542b'], [Infinity, '#5b2a86']];
const AURA = Array.from({ length: 400 }, (_, i) => {
  const x = i % 20;
  const y = Math.floor(i / 20);
  const d = Math.hypot(x - 9.5, y - 10.5);
  return `<rect x="${x}" y="${y}" width="1" height="1" fill="${AURA_BANDS.find(([r]) => d < r)[1]}"/>`;
}).join('');

const rects = (rows, palette, ox = 0, oy = 0) =>
  rows
    .flatMap((row, y) =>
      [...row].map((c, x) =>
        c === '.' || !palette[c] ? '' : `<rect x="${x + ox}" y="${y + oy}" width="1" height="1" fill="${palette[c]}"/>`,
      ),
    )
    .join('');

// The bounce: two pixels up and down in steps, like a game sprite.
const BOUNCE =
  '<animateTransform attributeName="transform" type="translate" values="0 0;0 -1;0 -2;0 -2;0 -1;0 0;0 0" keyTimes="0;.15;.3;.45;.6;.75;1" calcMode="discrete" dur="0.9s" repeatCount="indefinite"/>';

/** SVG for one badge (a theme entry, not an id). */
export function svg(badge, { rarity = 'common', accessories = [], size = 160 } = {}) {
  const palette = rarity === 'common' ? badge.palette : { ...badge.palette, ...badge.shiny };
  const crown = accessories.includes('crown') ? rects(ACCESSORIES.crown.rows, ACCESSORIES.crown.palette, 2, 3 + badge.crownY) : '';
  const sprite = rects(badge.rows, palette, 2, 3) + crown;
  const layers = [rarity === 'legendary' ? AURA : '', `<g>${sprite}${accessories.includes('bounce') ? BOUNCE : ''}</g>`];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="${size}" height="${size}" shape-rendering="crispEdges">${layers.join('')}</svg>`;
}
