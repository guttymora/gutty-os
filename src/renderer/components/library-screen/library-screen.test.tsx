// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MOCK_GAMES } from '@data/mock-games';

import { LibraryScreen } from './library-screen';

const getListedTitles = () =>
    within(screen.getByRole('region', { name: 'Games' }))
        .getAllByRole('button')
        .map((row) => row.querySelector('span span')?.textContent);

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
});
