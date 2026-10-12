import { useEffect, useState } from 'react';

import splashImage from '@assets/splash.png';

import styles from './splash-screen.module.css';

export const SPLASH_DURATION_MS = 2000;
export const SPLASH_FADE_MS = 400;

type SplashScreenProps = {
    onFinish: () => void;
};

export const SplashScreen = ({ onFinish }: SplashScreenProps) => {
    const [isLeaving, setIsLeaving] = useState(false);

    // Leave after the duration, or earlier on any key press / click
    useEffect(() => {
        const leave = () => setIsLeaving(true);
        const timer = window.setTimeout(leave, SPLASH_DURATION_MS);
        window.addEventListener('keydown', leave);
        window.addEventListener('pointerdown', leave);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('keydown', leave);
            window.removeEventListener('pointerdown', leave);
        };
    }, []);

    useEffect(() => {
        if (!isLeaving) {
            return;
        }
        const timer = window.setTimeout(onFinish, SPLASH_FADE_MS);

        return () => window.clearTimeout(timer);
    }, [isLeaving, onFinish]);

    return (
        <div
            className={styles.splash}
            data-leaving={isLeaving}
            style={{ transitionDuration: `${SPLASH_FADE_MS}ms` }}
            role="img"
            aria-label="GuttyOS"
        >
            <img className={styles.image} src={splashImage} alt="" />
        </div>
    );
};
