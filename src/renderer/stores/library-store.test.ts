// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_GAMES } from '@data/mock-games';

import { useLibraryStore } from './library-store';

describe('useLibraryStore', () => {
    beforeEach(() => {
        useLibraryStore.setState({
            status: 'loading',
            games: [],
            playingId: undefined,
        });
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

    it('marks the game as playing while it runs', async () => {
        let resolveLaunch: (result: { ok: true }) => void = () => undefined;
        vi.stubGlobal('bridgeAPI', {
            launchGame: vi.fn(
                () => new Promise((resolve) => (resolveLaunch = resolve))
            ),
        });

        const launching = useLibraryStore.getState().launchGame('abc');
        // Already set while mGBA starts, so input is ignored right away
        expect(useLibraryStore.getState().playingId).toBe('abc');
        resolveLaunch({ ok: true });

        expect(await launching).toEqual({ ok: true });
        expect(useLibraryStore.getState().playingId).toBe('abc');
    });

    it('refuses a second launch while a game runs', async () => {
        const launchGame = vi.fn();
        vi.stubGlobal('bridgeAPI', { launchGame });
        useLibraryStore.setState({ playingId: 'abc' });

        expect(await useLibraryStore.getState().launchGame('def')).toEqual({
            ok: false,
            reason: 'already-playing',
        });
        expect(launchGame).not.toHaveBeenCalled();
    });

    it.each([
        ['refused', vi.fn().mockResolvedValue({ ok: false, reason: 'busy' })],
        ['broken', vi.fn().mockRejectedValue(new Error('boom'))],
    ])('clears the playing game when the launch is %s', async (_, launch) => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.stubGlobal('bridgeAPI', { launchGame: launch });

        const result = await useLibraryStore.getState().launchGame('abc');

        expect(result.ok).toBe(false);
        expect(useLibraryStore.getState().playingId).toBeUndefined();
    });

    it('updates the game and clears the playing game when it quits', () => {
        const [game] = MOCK_GAMES;
        useLibraryStore.setState({ games: [game], playingId: game.id });

        useLibraryStore.getState().endGame({ ...game, playTimeMinutes: 1 });

        expect(useLibraryStore.getState()).toMatchObject({
            games: [{ ...game, playTimeMinutes: 1 }],
            playingId: undefined,
        });
    });

    it('clears the playing game even without updated stats', () => {
        const [game] = MOCK_GAMES;
        useLibraryStore.setState({ games: [game], playingId: game.id });

        useLibraryStore.getState().endGame();

        expect(useLibraryStore.getState()).toMatchObject({
            games: [game],
            playingId: undefined,
        });
    });
});
