// DevMemory — neon/cyberpunk theme tokens. Centralized so every component
// shares the same palette and glow treatment. Dark base, electric accents.

export const NEON = {
  bg: '#05060f',
  bgPanel: 'rgba(13, 16, 35, 0.72)',
  bgPanelSolid: '#0b0e22',
  border: 'rgba(0, 240, 255, 0.18)',
  borderStrong: 'rgba(0, 240, 255, 0.45)',
  text: '#e6f7ff',
  textDim: '#8aa0c0',
  textMuted: '#5a6a86',

  cyan: '#00f0ff',
  magenta: '#ff2bd6',
  purple: '#9d4bff',
  lime: '#aaff00',
  amber: '#ffb020',
  red: '#ff3b6b',
  green: '#2bffb0',
  blue: '#3b82ff',
};

// Node-type → neon colour (hex int for three.js + css string).
export const NEON_NODE: Record<string, { css: string; hex: number }> = {
  Project: { css: '#00f0ff', hex: 0x00f0ff },
  Component: { css: '#3b82ff', hex: 0x3b82ff },
  Dependency: { css: '#ffb020', hex: 0xffb020 },
  Decision: { css: '#9d4bff', hex: 0x9d4bff },
  Reason: { css: '#ff2bd6', hex: 0xff2bd6 },
  Bug: { css: '#ff3b6b', hex: 0xff3b6b },
  Fix: { css: '#2bffb0', hex: 0x2bffb0 },
};

export const glow = (color: string, size = 12) => `0 0 ${size}px ${color}, 0 0 ${size * 2}px ${color}44`;
