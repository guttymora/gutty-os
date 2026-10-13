import { create } from 'zustand';

import type { Game } from '@shared/game';

export type LibraryStatus = 'loading' | 'ready' | 'error';

type LibraryState = {
    status: LibraryStatus;
    games: Game[];
    loadGames: () => Promise<void>;
};

export const useLibraryStore = create<LibraryState>()((set) => ({
    status: 'loading',
    games: [],
    loadGames: async () => {
        set({ status: 'loading' });
        try {
            const games = await window.bridgeAPI.getGames();
            set({ games, status: 'ready' });
        } catch (error) {
            console.error('Could not load the game library:', error);
            set({ games: [], status: 'error' });
        }
    },
}));
