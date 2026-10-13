import { GameCover } from '@components/game-cover/game-cover';
import { PixelIcon } from '@components/pixel-icon/pixel-icon';
import { PLATFORMS } from '@data/platforms';
import type { Game } from '@shared/game';

import styles from './game-list.module.css';

type GameListProps = {
    games: Game[];
    selectedId?: string;
    onSelect: (id: string) => void;
    /** Shown instead of the list when there are no games */
    emptyMessage?: string;
};

export const GameList = ({
    games,
    selectedId,
    onSelect,
    emptyMessage = 'No games yet',
}: GameListProps) => (
    <section className={styles.panel} aria-label="Games">
        {games.length === 0 ? (
            <p className={styles.empty}>{emptyMessage}</p>
        ) : (
            <ul className={styles.list}>
                {games.map((game) => (
                    <li key={game.id}>
                        <button
                            type="button"
                            className={styles.row}
                            aria-current={
                                game.id === selectedId ? 'true' : undefined
                            }
                            onClick={() => onSelect(game.id)}
                        >
                            <GameCover game={game} size="thumbnail" />
                            <span className={styles.text}>
                                <span className={styles.title}>
                                    {game.title}
                                </span>
                                <span className={styles.platform}>
                                    {PLATFORMS[game.platform].label}
                                </span>
                            </span>
                            {game.isFavorite && (
                                <span
                                    className={styles.favorite}
                                    role="img"
                                    aria-label="Favorite"
                                >
                                    <PixelIcon name="star" scale={1.5} />
                                </span>
                            )}
                        </button>
                    </li>
                ))}
            </ul>
        )}
    </section>
);
