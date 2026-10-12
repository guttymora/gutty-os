import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
    applyPalette,
    DEFAULT_PALETTE_ID,
    PALETTES,
    type PaletteId,
} from '@data/palettes';

type ThemeState = {
    paletteId: PaletteId;
    setPalette: (id: PaletteId) => void;
};

const isPaletteId = (value: unknown): value is PaletteId =>
    PALETTES.some((palette) => palette.id === value);

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            paletteId: DEFAULT_PALETTE_ID,
            setPalette: (paletteId) => set({ paletteId }),
        }),
        {
            name: 'gutty-os:theme',
            storage: createJSONStorage(() => localStorage),
            partialize: ({ paletteId }) => ({ paletteId }),
            // Ignore saved palettes that no longer exist
            merge: (persisted, current) => {
                const paletteId = (persisted as Partial<ThemeState> | null)
                    ?.paletteId;

                return isPaletteId(paletteId)
                    ? { ...current, paletteId }
                    : current;
            },
        }
    )
);

/**
 * Applies the saved palette right away (call before the first render) and
 * keeps the document in sync with later changes. Returns an unsubscribe.
 */
export const initTheme = (root: HTMLElement = document.documentElement) => {
    applyPalette(useThemeStore.getState().paletteId, root);

    return useThemeStore.subscribe(({ paletteId }) =>
        applyPalette(paletteId, root)
    );
};
