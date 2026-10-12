import { PixelIcon } from '@components/pixel-icon/pixel-icon';
import { PLATFORMS } from '@data/platforms';
import type { Game } from '@shared/game';

import styles from './game-cover.module.css';

type GameCoverProps = {
    game: Game;
    size: 'thumbnail' | 'large';
};

/**
 * Shows the game's cover art, or a cartridge-label style placeholder in the
 * platform color while no cover is available.
 */
export const GameCover = ({ game, size }: GameCoverProps) => {
    const platform = PLATFORMS[game.platform];

    if (game.coverPath) {
        return (
            <img
                className={styles.cover}
                data-size={size}
                src={game.coverPath}
                alt={`${game.title} cover`}
            />
        );
    }

    return (
        <div
            className={styles.cover}
            data-size={size}
            data-platform={game.platform}
            role="img"
            aria-label={`${game.title} cover`}
        >
            <span className={styles.strip}>
                {size === 'large' && platform.label}
            </span>
            <div className={styles.body}>
                <PixelIcon
                    name={platform.icon}
                    scale={size === 'large' ? 5 : 2}
                />
                {size === 'large' && (
                    <span className={styles.title}>{game.title}</span>
                )}
            </div>
        </div>
    );
};
