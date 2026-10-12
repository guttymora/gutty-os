// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_PALETTE_ID } from '@data/palettes';

import { useThemeStore } from './theme-store';

describe('useThemeStore', () => {
    beforeEach(() => {
        localStorage.clear();
        useThemeStore.setState({ paletteId: DEFAULT_PALETTE_ID });
    });

    it('starts with the default palette', () => {
        expect(useThemeStore.getState().paletteId).toBe('escarcha');
    });

    it('changes and persists the palette', () => {
        useThemeStore.getState().setPalette('algodon');

        expect(useThemeStore.getState().paletteId).toBe('algodon');
        expect(
            JSON.parse(localStorage.getItem('gutty-os:theme') ?? '')
        ).toEqual({ state: { paletteId: 'algodon' }, version: 0 });
    });
});
