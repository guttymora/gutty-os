import type { PixelArt } from './art-to-rects';

const LINE = 'var(--color-line)';

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
        palette: { k: LINE, y: 'var(--color-star)' },
    },
    starEmpty: {
        rows: STAR_ROWS,
        palette: { k: LINE, y: 'var(--color-star-empty)' },
    },
    gameBoy: {
        rows: PORTRAIT_HANDHELD_ROWS,
        palette: {
            k: LINE,
            b: 'var(--color-device-gb-body)',
            d: 'var(--color-device-bezel)',
            s: 'var(--color-device-gb-screen)',
            a: 'var(--color-device-gb-buttons)',
        },
    },
    gameBoyColor: {
        rows: PORTRAIT_HANDHELD_ROWS,
        palette: {
            k: LINE,
            b: 'var(--color-device-gbc-body)',
            d: 'var(--color-device-bezel)',
            s: 'var(--color-device-gbc-screen)',
            a: 'var(--color-device-gbc-buttons)',
        },
    },
    gameBoyAdvance: {
        rows: LANDSCAPE_HANDHELD_ROWS,
        palette: {
            k: LINE,
            b: 'var(--color-device-gba-body)',
            d: 'var(--color-device-bezel)',
            s: 'var(--color-device-gba-screen)',
            a: 'var(--color-device-gba-buttons)',
        },
    },
} satisfies Record<string, PixelArt>;

export type IconName = keyof typeof icons;
