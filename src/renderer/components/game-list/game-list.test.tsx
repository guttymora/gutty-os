// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Game } from '@shared/game';

import { GameList } from './game-list';

const games: Game[] = [
    {
        id: 'tetris',
        title: 'Tetris',
        platform: 'gb',
        addedAt: '2026-10-01T10:00:00.000Z',
        rating: 4,
        playTimeMinutes: 0,
        isFavorite: false,
    },
    {
        id: 'golden-sun',
        title: 'Golden Sun',
        platform: 'gba',
        addedAt: '2026-10-01T10:00:00.000Z',
        rating: 5,
        playTimeMinutes: 0,
        isFavorite: true,
    },
];

describe('GameList', () => {
    it('shows each game with its platform', () => {
        render(<GameList games={games} onSelect={vi.fn()} />);
        const tetris = screen.getByRole('button', { name: /Tetris/ });

        expect(within(tetris).getByText('Game Boy')).toBeInTheDocument();
    });

    it('marks favorites and the selected game', () => {
        render(
            <GameList games={games} selectedId="tetris" onSelect={vi.fn()} />
        );
        const tetris = screen.getByRole('button', { name: /Tetris/ });
        const goldenSun = screen.getByRole('button', { name: /Golden Sun/ });

        expect(tetris).toHaveAttribute('aria-current', 'true');
        expect(
            within(goldenSun).getByLabelText('Favorite')
        ).toBeInTheDocument();
        expect(within(tetris).queryByLabelText('Favorite')).toBeNull();
    });

    it('reports the clicked game', async () => {
        const onSelect = vi.fn();
        render(<GameList games={games} onSelect={onSelect} />);

        await userEvent.click(
            screen.getByRole('button', { name: /Golden Sun/ })
        );

        expect(onSelect).toHaveBeenCalledWith('golden-sun');
    });

    it('shows an empty state without games', () => {
        render(<GameList games={[]} onSelect={vi.fn()} />);

        expect(screen.getByText('No games yet')).toBeInTheDocument();
    });
});
