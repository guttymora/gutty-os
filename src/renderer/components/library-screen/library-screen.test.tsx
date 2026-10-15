// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_GAMES } from '@data/mock-games';
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
});
