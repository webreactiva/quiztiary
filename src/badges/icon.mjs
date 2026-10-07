// The site icon: a pixel-art speech bubble with a question mark, filled with the configured
// accent colour. Same format as a badge (16×16, palette keys as characters).
import { rects } from './render.mjs';

const ROWS = [
  '................',
  '...kkkkkkkkkk...',
  '..kaaaaaaaaaak..',
  '.kaaaawwwwaaaak.',
  '.kaaawwaawwaaak.',
  '.kaaaaaaawwaaak.',
  '.kaaaaaawwaaaak.',
  '.kaaaaawwaaaaak.',
  '.kaaaaawwaaaaak.',
  '.kaaaaaaaaaaaak.',
  '.kaaaaawwaaaaak.',
  '..kaaaaaaaaaak..',
  '...kkkaakkkkk...',
  '.....kaak.......',
  '......kak.......',
  '.......k........',
];

export const icon = (accent) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects(ROWS, { k: '#2b2118', a: accent, w: '#fffaf2' })}</svg>`;
