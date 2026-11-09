// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_GAMES } from '@data/mock-games';
import { useLibraryStore } from '@stores/library-store';
import { useUiStore } from '@stores/ui-store';

import { LibraryScreen } from './library-screen';

// Game titles in the list, without the "Add a game" item at the top
const getListedTitles = () =>
    within(screen.getByRole('region', { name: 'Games' }))
        .getAllByRole('button')
        .map((row) => row.querySelector('span span')?.textContent)
        .filter((title) => title !== 'Add a game');

const getDetailsTitle = () =>
    within(screen.getByRole('region', { name: 'Game details' })).getByRole(
        'heading'
    ).textContent;

describe('LibraryScreen', () => {
    it('starts on all games with the first one selected', () => {
        render(<LibraryScreen games={MOCK_GAMES} />);

        expect(getListedTitles()).toHaveLength(MOCK_GAMES.length);
        expect(getDetailsTitle()).toBe('Advance Wars');
    });

    it('filters by platform and selects its first game', async () => {
        render(<LibraryScreen games={MOCK_GAMES} />);

        await userEvent.click(screen.getByRole('button', { name: 'GB Color' }));

        expect(getListedTitles()).toEqual([
            'Pokémon Crystal',
            'The Legend of Zelda: Oracle of Seasons',
            'Wario Land 3',
        ]);
        expect(getDetailsTitle()).toBe('Pokémon Crystal');
    });

    it('shows the details of the clicked game', async () => {
        render(<LibraryScreen games={MOCK_GAMES} />);

        await userEvent.click(screen.getByRole('button', { name: /Tetris/ }));

        expect(getDetailsTitle()).toBe('Tetris');
    });

    it('shows the empty state when there are no games', () => {
        render(<LibraryScreen games={[]} />);

        expect(screen.getByText('No games yet')).toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Game details' })
        ).toBeNull();
    });

    it.each([
        ['loading', 'Loading games…'],
        ['ready', 'No games yet'],
        ['error', "Couldn't load your games"],
    ] as const)(
        'shows the %s message when the list is empty',
        (status, text) => {
            render(<LibraryScreen games={[]} status={status} />);

            expect(screen.getByText(text)).toBeInTheDocument();
        }
    );

    describe('"Add a game" item', () => {
        beforeEach(() => {
            useUiStore.setState({ isAddGameOpen: false });
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it('is the first item of the list', () => {
            render(<LibraryScreen games={MOCK_GAMES} />);

            const [first] = within(
                screen.getByRole('region', { name: 'Games' })
            ).getAllByRole('button');
            expect(first).toHaveTextContent('Add a game');
        });

        it('opens the dialog and keeps the game details visible', async () => {
            render(<LibraryScreen games={MOCK_GAMES} />);

            await userEvent.click(
                screen.getByRole('button', { name: /Add a game/ })
            );

            expect(
                screen.getByRole('dialog', { name: 'Add a game' })
            ).toBeInTheDocument();
            expect(getDetailsTitle()).toBe('Advance Wars');
        });

        it('shows no details while there are no games', () => {
            render(<LibraryScreen games={[]} />);

            expect(
                screen.queryByRole('region', { name: 'Game details' })
            ).toBeNull();
            expect(
                screen.getByRole('button', { name: /Add a game/ })
            ).toBeInTheDocument();
        });

        it('limits the ROM file dialog to the selected platform', async () => {
            const chooseImportFile = vi
                .fn()
                .mockResolvedValue({ ok: false, reason: 'cancelled' });
            vi.stubGlobal('bridgeAPI', { chooseImportFile });
            render(<LibraryScreen games={MOCK_GAMES} />);

            await userEvent.click(
                within(
                    screen.getByRole('navigation', { name: 'Platforms' })
                ).getByRole('button', { name: 'GB Advance' })
            );
            await userEvent.click(
                screen.getByRole('button', { name: /Add a game/ })
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Choose ROM' })
            );

            expect(chooseImportFile).toHaveBeenCalledWith('rom', 'gba');
        });

        it('selects the added game, even from another platform', async () => {
            const [, ...rest] = MOCK_GAMES;
            const added = MOCK_GAMES[0];
            const { rerender } = render(<LibraryScreen games={rest} />);
            vi.stubGlobal('bridgeAPI', {
                chooseImportFile: vi.fn().mockResolvedValue({
                    ok: true,
                    file: { token: 't', name: 'x.gb', kind: 'rom' },
                }),
                importGame: vi.fn().mockResolvedValue({
                    status: 'added',
                    game: added,
                    warnings: [],
                }),
            });
            await userEvent.click(
                within(
                    screen.getByRole('navigation', { name: 'Platforms' })
                ).getByRole('button', { name: 'GB Advance' })
            );

            await userEvent.click(
                screen.getByRole('button', { name: /Add a game/ })
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Choose ROM' })
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Add game' })
            );
            rerender(<LibraryScreen games={MOCK_GAMES} />);

            expect(
                screen.queryByRole('dialog', { name: 'Add a game' })
            ).toBeNull();
            expect(getDetailsTitle()).toBe(added.title);
            expect(
                within(
                    screen.getByRole('navigation', { name: 'Platforms' })
                ).getByRole('button', { name: 'All Games' })
            ).toHaveAttribute('aria-current', 'true');
        });
    });

    describe('playing', () => {
        const advanceWars = MOCK_GAMES.find(
            (game) => game.title === 'Advance Wars'
        );
        let launchGame: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            useLibraryStore.setState({ playingId: undefined });
            useUiStore.setState({ isAddGameOpen: false, isSearchOpen: false });
            launchGame = vi.fn().mockResolvedValue({ ok: true });
            vi.stubGlobal('bridgeAPI', { launchGame });
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it.each(['a', 'Enter'])(
            'launches the selected game with %s',
            async (key) => {
                render(<LibraryScreen games={MOCK_GAMES} />);

                fireEvent.keyDown(window, { key });

                expect(launchGame).toHaveBeenCalledWith(advanceWars?.id);
                expect(await screen.findByRole('status')).toHaveTextContent(
                    'Playing Advance Wars'
                );
            }
        );

        it('launches with Enter on a focused game row', () => {
            render(<LibraryScreen games={MOCK_GAMES} />);
            const row = screen.getByRole('button', { name: /Advance Wars/ });
            row.focus();

            fireEvent.keyDown(row, { key: 'Enter' });

            expect(launchGame).toHaveBeenCalledWith(advanceWars?.id);
        });

        it('lets Enter press another focused control instead of playing', () => {
            render(<LibraryScreen games={MOCK_GAMES} />);
            const addGame = screen.getByRole('button', { name: /Add a game/ });
            addGame.focus();

            const notCancelled = fireEvent.keyDown(addGame, { key: 'Enter' });

            expect(launchGame).not.toHaveBeenCalled();
            expect(notCancelled).toBe(true);
        });

        it('plays with A even when another control is focused', () => {
            render(<LibraryScreen games={MOCK_GAMES} />);
            const addGame = screen.getByRole('button', { name: /Add a game/ });
            addGame.focus();

            fireEvent.keyDown(addGame, { key: 'a' });

            expect(launchGame).toHaveBeenCalledWith(advanceWars?.id);
        });

        it('launches from the A hint', async () => {
            render(<LibraryScreen games={MOCK_GAMES} />);

            await userEvent.click(
                screen.getByRole('button', { name: 'APlay' })
            );

            expect(launchGame).toHaveBeenCalledWith(advanceWars?.id);
        });

        it('ignores A while a game runs', () => {
            useLibraryStore.setState({ playingId: advanceWars?.id });
            render(<LibraryScreen games={MOCK_GAMES} />);

            fireEvent.keyDown(window, { key: 'a' });

            expect(launchGame).not.toHaveBeenCalled();
        });

        it("doesn't play letters typed into the search box", async () => {
            render(<LibraryScreen games={MOCK_GAMES} />);

            fireEvent.keyDown(window, { key: 'x' });
            await userEvent.type(screen.getByRole('searchbox'), 'mario');

            expect(launchGame).not.toHaveBeenCalled();
            expect(screen.getByRole('searchbox')).toHaveValue('mario');
        });

        it('ignores A while the library is covered', () => {
            render(<LibraryScreen games={MOCK_GAMES} isActive={false} />);

            fireEvent.keyDown(window, { key: 'a' });

            expect(launchGame).not.toHaveBeenCalled();
        });

        it('ignores A when there is no game to play', () => {
            render(<LibraryScreen games={[]} />);

            fireEvent.keyDown(window, { key: 'a' });

            expect(launchGame).not.toHaveBeenCalled();
        });

        it('explains why a game could not start until another is picked', async () => {
            launchGame.mockResolvedValue({
                ok: false,
                reason: 'emulator-not-found',
            });
            render(<LibraryScreen games={MOCK_GAMES} />);

            fireEvent.keyDown(window, { key: 'a' });

            expect(await screen.findByRole('alert')).toHaveTextContent(
                'mGBA was not found. Move it to Applications'
            );
            expect(screen.queryByRole('status')).toBeNull();

            await userEvent.click(
                screen.getByRole('button', { name: /Tetris/ })
            );
            expect(screen.queryByRole('alert')).toBeNull();
        });
    });

    describe('search', () => {
        beforeEach(() => {
            useUiStore.setState({ isSearchOpen: false, isAddGameOpen: false });
        });

        it('opens with X and from the X hint', async () => {
            render(<LibraryScreen games={MOCK_GAMES} />);

            fireEvent.keyDown(window, { key: 'x' });
            expect(
                screen.getByRole('dialog', { name: 'Search' })
            ).toBeVisible();

            act(() => useUiStore.setState({ isSearchOpen: false }));
            await userEvent.click(
                screen.getByRole('button', { name: 'XSearch' })
            );
            expect(
                screen.getByRole('dialog', { name: 'Search' })
            ).toBeVisible();
        });

        it('ignores X while the library is covered', () => {
            render(<LibraryScreen games={MOCK_GAMES} isActive={false} />);

            fireEvent.keyDown(window, { key: 'x' });

            expect(screen.queryByRole('dialog')).toBeNull();
        });

        it('shows the chosen game, switching to all games', async () => {
            render(<LibraryScreen games={MOCK_GAMES} />);
            await userEvent.click(
                screen.getByRole('button', { name: 'GB Color' })
            );

            fireEvent.keyDown(window, { key: 'x' });
            await userEvent.type(
                screen.getByRole('searchbox'),
                'minish{Enter}'
            );

            expect(screen.queryByRole('dialog')).toBeNull();
            expect(getListedTitles()).toHaveLength(MOCK_GAMES.length);
            expect(getDetailsTitle()).toBe(
                'The Legend of Zelda: The Minish Cap'
            );
        });
    });
});
