import { describe, expect, it } from 'vitest';

import type { Game } from '@shared/game';

import { filterGames, formatPlayTime } from './games';

const game = (title: string, platform: Game['platform']): Game => ({
    id: title,
    title,
    platform,
    addedAt: '2026-10-01T10:00:00.000Z',
    rating: 0,
    playTimeMinutes: 0,
    isFavorite: false,
});

describe('filterGames', () => {
    const games = [
        game('Tetris', 'gb'),
        game('Golden Sun', 'gba'),
        game('Advance Wars', 'gba'),
    ];

    it('returns every game sorted by title for "all"', () => {
        expect(filterGames(games, 'all').map((g) => g.title)).toEqual([
            'Advance Wars',
            'Golden Sun',
            'Tetris',
        ]);
    });

    it('keeps only the games of the selected platform', () => {
        expect(filterGames(games, 'gba').map((g) => g.title)).toEqual([
            'Advance Wars',
            'Golden Sun',
        ]);
    });

    it('returns an empty list when a platform has no games', () => {
        expect(filterGames(games, 'gbc')).toEqual([]);
    });
});

describe('formatPlayTime', () => {
    it.each([
        [0, '--'],
        [45, '45m'],
        [60, '1h 0m'],
        [252, '4h 12m'],
    ])('formats %i minutes as "%s"', (minutes, expected) => {
        expect(formatPlayTime(minutes)).toBe(expected);
    });
});
