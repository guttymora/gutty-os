// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_GAMES } from '@data/mock-games';

import { useLibraryStore } from './library-store';

describe('useLibraryStore', () => {
    beforeEach(() => {
        useLibraryStore.setState({ status: 'loading', games: [] });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('loads the games from the main process', async () => {
        vi.stubGlobal('bridgeAPI', {
            getGames: vi.fn().mockResolvedValue(MOCK_GAMES),
        });

        await useLibraryStore.getState().loadGames();

        expect(useLibraryStore.getState()).toMatchObject({
            status: 'ready',
            games: MOCK_GAMES,
        });
    });

    it('reports an error when the library cannot be loaded', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.stubGlobal('bridgeAPI', {
            getGames: vi.fn().mockRejectedValue(new Error('boom')),
        });

        await useLibraryStore.getState().loadGames();

        expect(useLibraryStore.getState()).toMatchObject({
            status: 'error',
            games: [],
        });
    });

    it('adds a game, replacing it if it is already listed', () => {
        const [first, second] = MOCK_GAMES;
        useLibraryStore.setState({ status: 'ready', games: [first] });

        useLibraryStore.getState().addGame(second);
        useLibraryStore.getState().addGame({ ...first, rating: 1 });

        expect(useLibraryStore.getState().games).toEqual([
            second,
            { ...first, rating: 1 },
        ]);
    });
});
