// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Game } from '@shared/game';

import { GameDetails } from './game-details';

const game: Game = {
    id: 'super-mario-land',
    title: 'Super Mario Land',
    platform: 'gb',
    addedAt: '2026-10-01T10:00:00.000Z',
    releaseYear: 1989,
    rating: 3,
    playTimeMinutes: 252,
    isFavorite: false,
};

describe('GameDetails', () => {
    it('shows the cover, platform, release, play time and rating', () => {
        render(<GameDetails game={game} />);

        expect(
            screen.getByRole('heading', { name: 'Super Mario Land' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: 'Super Mario Land cover' })
        ).toBeInTheDocument();
        expect(screen.getByText('GB')).toBeInTheDocument();
        expect(screen.getByText('1989')).toBeInTheDocument();
        expect(screen.getByText('4h 12m')).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: '3 of 5 stars' })
        ).toBeInTheDocument();
    });

    it('uses the cover image when the game has one', () => {
        render(
            <GameDetails
                game={{ ...game, coverUrl: 'gutty://cover/super-mario-land' }}
            />
        );

        expect(
            screen.getByRole('img', { name: 'Super Mario Land cover' })
        ).toHaveAttribute('src', 'gutty://cover/super-mario-land');
    });
});
