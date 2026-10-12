// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PALETTE_ID, getPalette } from '@data/palettes';

import { initTheme, THEME_STORAGE_KEY, useThemeStore } from './theme-store';

// Read and write through the store's own persist storage, so the tests
// don't depend on how zustand serializes the saved state
const persistStorage = () => {
    const { storage } = useThemeStore.persist.getOptions();
    if (!storage) {
        throw new Error('Theme store has no persist storage');
    }

    return storage;
};

const saveTheme = (paletteId: unknown) =>
    persistStorage().setItem(THEME_STORAGE_KEY, {
        state: { paletteId } as never,
        version: 0,
    });

// Simulates an app restart: a fresh store module reading localStorage
const loadFreshStore = async () => {
    vi.resetModules();
    const module = await import('./theme-store');

    return module.useThemeStore;
};

describe('useThemeStore', () => {
    beforeEach(() => {
        localStorage.clear();
        useThemeStore.setState({ paletteId: DEFAULT_PALETTE_ID });
    });

    it('starts with the default palette', () => {
        expect(useThemeStore.getState().paletteId).toBe('escarcha');
    });

    it('changes and persists the palette', async () => {
        useThemeStore.getState().setPalette('algodon');

        expect(useThemeStore.getState().paletteId).toBe('algodon');
        expect(
            (await persistStorage().getItem(THEME_STORAGE_KEY))?.state
        ).toEqual({ paletteId: 'algodon' });
    });

    it('restores the saved palette on startup', async () => {
        saveTheme('sorbete');

        const store = await loadFreshStore();

        expect(store.getState().paletteId).toBe('sorbete');
    });

    it('falls back to the default when the saved palette no longer exists', async () => {
        saveTheme('removed-palette');

        const store = await loadFreshStore();

        expect(store.getState().paletteId).toBe(DEFAULT_PALETTE_ID);
    });

    it('falls back to the default when the saved data is corrupted', async () => {
        localStorage.setItem(THEME_STORAGE_KEY, '{not json');

        const store = await loadFreshStore();

        expect(store.getState().paletteId).toBe(DEFAULT_PALETTE_ID);
    });
});

describe('initTheme', () => {
    beforeEach(() => {
        localStorage.clear();
        useThemeStore.setState({ paletteId: 'pocket' });
    });

    it('applies the current palette immediately', () => {
        const root = document.createElement('div');
        const unsubscribe = initTheme(root);

        expect(root.dataset.palette).toBe('pocket');
        expect(root.style.getPropertyValue('--color-paper')).toBe(
            getPalette('pocket').colors.paper
        );
        unsubscribe();
    });

    it('follows palette changes until unsubscribed', () => {
        const root = document.createElement('div');
        const unsubscribe = initTheme(root);

        useThemeStore.getState().setPalette('algodon');
        expect(root.dataset.palette).toBe('algodon');

        unsubscribe();
        useThemeStore.getState().setPalette('sorbete');
        expect(root.dataset.palette).toBe('algodon');
    });
});
