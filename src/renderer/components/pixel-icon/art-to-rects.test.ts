import { describe, expect, it } from 'vitest';

import { artToRects } from './art-to-rects';
import { icons } from './icons';

describe('artToRects', () => {
    it('merges horizontal runs and skips transparent pixels', () => {
        const rects = artToRects({
            rows: ['aab.', '.bbb'],
            palette: { a: 'red', b: 'blue' },
        });

        expect(rects).toEqual([
            { x: 0, y: 0, width: 2, color: 'red' },
            { x: 2, y: 0, width: 1, color: 'blue' },
            { x: 1, y: 1, width: 3, color: 'blue' },
        ]);
    });

    it('throws when rows have different widths', () => {
        expect(() =>
            artToRects({ rows: ['aa', 'a'], palette: { a: 'red' } })
        ).toThrow('row 1 has 1 pixels, expected 2');
    });

    it('throws when a key has no palette color', () => {
        expect(() =>
            artToRects({ rows: ['ab'], palette: { a: 'red' } })
        ).toThrow('key "b" has no color');
    });

    it.each(Object.entries(icons))('icon "%s" is valid pixel art', (_, art) => {
        expect(() => artToRects(art)).not.toThrow();
    });
});
