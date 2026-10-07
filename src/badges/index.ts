import config from '../../quiztiary.config.mjs';
import { locale } from '../i18n/index.ts';
import { svg } from './render.mjs';

export type Badge = {
  hint: string;
  text: Record<string, { name: string; kind: string }>;
  crownY: number;
  palette: Record<string, string>;
  shiny: Record<string, string>;
  rows: string[];
};

const themes = import.meta.glob<{ name: string; badges: Record<string, Badge> }>('./themes/*.mjs', { eager: true, import: 'default' });
const active = themes[`./themes/${config.badges}.mjs`];
if (!active) throw new Error(`quiztiary.config.mjs: badges "${config.badges}" has no src/badges/themes/${config.badges}.mjs`);

/** The active theme's badges, by id. */
export const BADGES = active.badges;
export const badgeText = (id: string) => BADGES[id].text[locale];

/** SVG for a badge of the active theme, by id. */
export const badgeSvg = (id: string, opts?: Parameters<typeof svg>[1]) => svg(BADGES[id], opts);
