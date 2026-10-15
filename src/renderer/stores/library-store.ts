import { create } from 'zustand';

import type { Game } from '@shared/game';

export type LibraryStatus = 'loading' | 'ready' | 'error';

type LibraryState = {
    status: LibraryStatus;
    games: Game[];
    loadGames: () => Promise<void>;
    /** Adds a game, or replaces it if it is already in the list */
    addGame: (game: Game) => void;
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
    addGame: (game) =>
        set(({ games }) => ({
            games: [...games.filter(({ id }) => id !== game.id), game],
        })),
}));
