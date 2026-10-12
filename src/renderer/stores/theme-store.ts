import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_PALETTE_ID, type PaletteId } from '@data/palettes';

type ThemeState = {
    paletteId: PaletteId;
    setPalette: (id: PaletteId) => void;
};

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
        }
    )
);
