// Colour tokens for the README artwork, one set per GitHub theme.
// tests/art.test.mjs checks every text/background pair in PAIRS for WCAG AA (4.5:1).
export const THEMES = {
  dark: {
    bgA: '#090D14', bgB: '#111A28', bgC: '#17131F',
    grid: '#A7B8D0', gridOpacity: 0.08,
    frame: '#C4D2E8', frameOpacity: 0.16,
    gold: '#D6B77F', title: '#F3F4F6', sub: '#B7C4D7', body: '#AAB8CA', faint: '#8A99AE', blue: '#91B8E8',
    cardA: '#151F2D', cardB: '#171D28', cardLine: '#34465E', cardTitle: '#F4F5F7',
    glow: '#6885B4', glowOpacity: 0.2, shadow: '#02050A', shadowOpacity: 0.6, cardShadowOpacity: 0.28,
    ringGold: '#E6C58C', ringBlue: '#8CA9D0', ringSoft: '#B9CBE4', dot: '#E8C58B',
    tileGold: '#D9C08E', tileBlue: '#91B8E8',
  },
  light: {
    bgA: '#F8FAFD', bgB: '#EDF1F8', bgC: '#F2EEF6',
    grid: '#1C2F52', gridOpacity: 0.06,
    frame: '#1C2F52', frameOpacity: 0.16,
    gold: '#85601C', title: '#0F1B2D', sub: '#33445D', body: '#3D4D66', faint: '#56667F', blue: '#245AA8',
    cardA: '#FFFFFF', cardB: '#F9FBFE', cardLine: '#C3CFE2', cardTitle: '#0F1B2D',
    glow: '#7D9BD0', glowOpacity: 0.3, shadow: '#1D2B45', shadowOpacity: 0.22, cardShadowOpacity: 0.1,
    ringGold: '#A47A2E', ringBlue: '#4F76B0', ringSoft: '#5B7FB5', dot: '#A47A2E',
    tileGold: '#85601C', tileBlue: '#245AA8',
  },
};

// [text colour, background it sits on]
export const PAIRS = [
  ['gold', 'bgA'], ['gold', 'bgB'], ['gold', 'bgC'], ['title', 'bgA'], ['title', 'bgB'], ['title', 'bgC'],
  ['sub', 'bgA'], ['sub', 'bgB'], ['sub', 'bgC'], ['body', 'bgA'], ['body', 'bgB'], ['body', 'bgC'],
  ['faint', 'bgA'], ['faint', 'bgB'], ['faint', 'bgC'],
  ['gold', 'cardA'], ['gold', 'cardB'], ['cardTitle', 'cardA'], ['cardTitle', 'cardB'],
  ['body', 'cardA'], ['body', 'cardB'], ['blue', 'cardA'], ['blue', 'cardB'],
];
