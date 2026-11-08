import { create } from 'zustand';

import type { Game } from '@shared/game';
import type { LaunchResult } from '@shared/launch';

export type LibraryStatus = 'loading' | 'ready' | 'error';

type LibraryState = {
    status: LibraryStatus;
    games: Game[];
    loadGames: () => Promise<void>;
    /** Adds a game, or replaces it if it is already in the list */
    addGame: (game: Game) => void;
    /** The game being played, set from the launch until the emulator quits */
    playingId?: string;
    launchGame: (id: string) => Promise<LaunchResult>;
    /** The emulator quit; `game` has the updated stats when they were saved */
    endGame: (game?: Game) => void;
};

export const useLibraryStore = create<LibraryState>()((set, get) => ({
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
    launchGame: async (id) => {
        if (get().playingId) {
            return { ok: false, reason: 'already-playing' };
        }
        // Set before the launch, so input is ignored while mGBA starts
        set({ playingId: id });
        let result: LaunchResult;
        try {
            result = await window.bridgeAPI.launchGame(id);
        } catch (error) {
            console.error('Could not launch the game:', error);
            result = { ok: false, reason: 'failed' };
        }
        if (!result.ok) {
            set({ playingId: undefined });
        }
        return result;
    },
    endGame: (game) => {
        if (game) {
            get().addGame(game);
        }
        set({ playingId: undefined });
    },
}));
