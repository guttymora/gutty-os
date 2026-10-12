// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
    applyPalette,
    DEFAULT_PALETTE_ID,
    getPalette,
    PALETTES,
    toCssVariable,
} from './palettes';

describe('palettes', () => {
    it('ships Escarcha as the default plus Sorbete, Pocket and Algodón', () => {
        expect(DEFAULT_PALETTE_ID).toBe('escarcha');
        expect(PALETTES.map((palette) => palette.name)).toEqual([
            'Escarcha',
            'Sorbete',
            'Pocket',
            'Algodón de azúcar',
        ]);
    });

    it('uses valid hex colors for every token', () => {
        for (const { colors } of PALETTES) {
            for (const value of Object.values(colors)) {
                expect(value).toMatch(/^#[0-9a-f]{6}$/);
            }
        }
    });

    it('falls back to the default palette for unknown ids', () => {
        expect(getPalette('nope' as never).id).toBe(DEFAULT_PALETTE_ID);
    });

    it('maps palette keys to CSS variables', () => {
        expect(toCssVariable('buttonAFill')).toBe('--color-button-a-fill');
        expect(toCssVariable('deviceGbcScreen')).toBe(
            '--color-device-gbc-screen'
        );
    });

    it('applies a palette as CSS variables on the root element', () => {
        const root = document.createElement('div');
        applyPalette('pocket', root);

        expect(root.dataset.palette).toBe('pocket');
        expect(root.style.getPropertyValue('--color-paper')).toBe(
            getPalette('pocket').colors.paper
        );
    });
});
