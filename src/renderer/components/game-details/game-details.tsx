import { GameCover } from '@components/game-cover/game-cover';
import { RatingStars } from '@components/rating-stars/rating-stars';
import { PLATFORMS } from '@data/platforms';
import type { Game } from '@shared/game';
import { formatPlayTime } from '@utils/games';

import styles from './game-details.module.css';

type GameDetailsProps = {
    game: Game;
};

export const GameDetails = ({ game }: GameDetailsProps) => (
    <section className={styles.details} aria-label="Game details">
        <GameCover game={game} size="large" />
        <div className={styles.card}>
            <h2 className={styles.title}>{game.title}</h2>
            <dl className={styles.facts}>
                <div className={styles.fact}>
                    <dt>Platform:</dt>
                    <dd>{PLATFORMS[game.platform].shortLabel}</dd>
                </div>
                <div className={styles.fact}>
                    <dt>Release:</dt>
                    <dd>{game.releaseYear ?? '--'}</dd>
                </div>
                <div className={styles.fact}>
                    <dt>Play time:</dt>
                    <dd className={styles.playTime}>
                        {formatPlayTime(game.playTimeMinutes)}
                    </dd>
                </div>
            </dl>
            <RatingStars rating={game.rating} />
        </div>
    </section>
);
