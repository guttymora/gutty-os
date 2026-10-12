import { PixelIcon } from '@components/pixel-icon/pixel-icon';

import styles from './rating-stars.module.css';

const MAX_RATING = 5;

type RatingStarsProps = {
    rating: number;
};

export const RatingStars = ({ rating }: RatingStarsProps) => (
    <div
        className={styles.stars}
        role="img"
        aria-label={`${rating} of ${MAX_RATING} stars`}
    >
        {Array.from({ length: MAX_RATING }, (_, index) => (
            <PixelIcon
                key={index}
                name={index < rating ? 'star' : 'starEmpty'}
                scale={2}
            />
        ))}
    </div>
);
