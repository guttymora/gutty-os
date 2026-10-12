import type { PixelArt } from './art-to-rects';

const INK = '#1d1f24';

const STAR_ROWS = [
    '.....k.....',
    '....kyk....',
    '....kyk....',
    'kkkkyyykkkk',
    'kyyyyyyyyyk',
    '.kyyyyyyyk.',
    '..kyyyyyk..',
    '.kyyykyyyk.',
    '.kyyk.kyyk.',
    '.kkk...kkk.',
];

// Portrait handheld shared by Game Boy and Game Boy Color
const PORTRAIT_HANDHELD_ROWS = [
    '.kkkkkkkkkk.',
    'kbbbbbbbbbbk',
    'kbddddddddbk',
    'kbdssssssdbk',
    'kbdssssssdbk',
    'kbdssssssdbk',
    'kbdssssssdbk',
    'kbddddddddbk',
    'kbbbbbbbbbbk',
    'kbbkbbbbbabk',
    'kbkkkbbabbbk',
    'kbbkbbbbbbbk',
    'kbbbbbbbbbbk',
    'kbbbbbbbbbbk',
    'kbbbbbbbbbbk',
    '.kkkkkkkkkk.',
];

const LANDSCAPE_HANDHELD_ROWS = [
    '..kkkkkkkkkkkkkk..',
    '.kbbbbbbbbbbbbbbk.',
    'kbbbbddddddddbbbbk',
    'kbbkbdssssssdbbabk',
    'kbkkkdssssssdbabbk',
    'kbbkbdssssssdbbbbk',
    'kbbbbddddddddbbbbk',
    '.kbbbbbbbbbbbbbbk.',
    '..kkkkkkkkkkkkkk..',
];

export const icons = {
    star: {
        rows: STAR_ROWS,
        palette: { k: INK, y: 'var(--color-star)' },
    },
    starEmpty: {
        rows: STAR_ROWS,
        palette: { k: INK, y: 'var(--color-star-empty)' },
    },
    gameBoy: {
        rows: PORTRAIT_HANDHELD_ROWS,
        palette: {
            k: INK,
            b: '#c9c7c2',
            d: '#5b5d6b',
            s: '#9bbc0f',
            a: '#a3195b',
        },
    },
    gameBoyColor: {
        rows: PORTRAIT_HANDHELD_ROWS,
        palette: {
            k: INK,
            b: '#8a4fd1',
            d: '#2b2b35',
            s: '#a8e0ec',
            a: INK,
        },
    },
    gameBoyAdvance: {
        rows: LANDSCAPE_HANDHELD_ROWS,
        palette: {
            k: INK,
            b: '#5a54d1',
            d: '#2b2b35',
            s: '#c4d6ff',
            a: '#d9d7d2',
        },
    },
} satisfies Record<string, PixelArt>;

export type IconName = keyof typeof icons;
