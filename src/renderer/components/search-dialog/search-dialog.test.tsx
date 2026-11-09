// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_GAMES } from '@data/mock-games';
import { useUiStore } from '@stores/ui-store';

import { SearchDialog } from './search-dialog';

const getResultTitles = () =>
    within(screen.getByRole('list', { name: 'Results' }))
        .getAllByRole('button')
        .map((button) => button.querySelector('span + span')?.textContent);

describe('SearchDialog', () => {
    beforeEach(() => {
        useUiStore.setState({ isSearchOpen: true });
    });

    it('focuses the search box and explains what it searches', () => {
        render(<SearchDialog games={MOCK_GAMES} onOpen={vi.fn()} />);

        expect(screen.getByLabelText('Game title, any console')).toHaveFocus();
        expect(
            screen.getByText(/Searches Game Boy, GB Color and GB Advance/)
        ).toBeInTheDocument();
    });

    it('lists matching games from every platform', async () => {
        render(<SearchDialog games={MOCK_GAMES} onOpen={vi.fn()} />);

        await userEvent.type(screen.getByRole('searchbox'), 'zelda');

        expect(getResultTitles()).toEqual([
            "The Legend of Zelda: Link's Awakening",
            'The Legend of Zelda: Oracle of Seasons',
            'The Legend of Zelda: The Minish Cap',
        ]);
    });

    it('says so when nothing matches', async () => {
        render(<SearchDialog games={MOCK_GAMES} onOpen={vi.fn()} />);

        await userEvent.type(screen.getByRole('searchbox'), 'sonic');

        expect(screen.getByRole('status')).toHaveTextContent(
            'No games match “sonic”'
        );
    });

    it('opens the first result with Enter and closes', async () => {
        const onOpen = vi.fn();
        render(<SearchDialog games={MOCK_GAMES} onOpen={onOpen} />);

        await userEvent.type(screen.getByRole('searchbox'), 'zelda{Enter}');

        expect(onOpen).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "The Legend of Zelda: Link's Awakening",
            })
        );
        expect(useUiStore.getState().isSearchOpen).toBe(false);
    });

    it('does nothing on Enter without results', async () => {
        const onOpen = vi.fn();
        render(<SearchDialog games={MOCK_GAMES} onOpen={onOpen} />);

        await userEvent.type(screen.getByRole('searchbox'), 'sonic{Enter}');

        expect(onOpen).not.toHaveBeenCalled();
        expect(useUiStore.getState().isSearchOpen).toBe(true);
    });

    it('opens a clicked result', async () => {
        const onOpen = vi.fn();
        render(<SearchDialog games={MOCK_GAMES} onOpen={onOpen} />);

        await userEvent.type(screen.getByRole('searchbox'), 'zelda');
        await userEvent.click(
            screen.getByRole('button', { name: /Minish Cap/ })
        );

        expect(onOpen).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'The Legend of Zelda: The Minish Cap',
            })
        );
    });

    it('closes with Escape, even from the search box', () => {
        render(<SearchDialog games={MOCK_GAMES} onOpen={vi.fn()} />);

        fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });

        expect(useUiStore.getState().isSearchOpen).toBe(false);
    });

    it('closes with the close button and the backdrop', async () => {
        const { container } = render(
            <SearchDialog games={MOCK_GAMES} onOpen={vi.fn()} />
        );

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(useUiStore.getState().isSearchOpen).toBe(false);

        useUiStore.setState({ isSearchOpen: true });
        await userEvent.click(container.firstElementChild as Element);
        expect(useUiStore.getState().isSearchOpen).toBe(false);
    });
});
