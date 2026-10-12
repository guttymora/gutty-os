import type { ReactNode } from 'react';

import styles from './window-bar.module.css';

type WindowBarProps = {
    title: string;
    /** Status items shown on the right side (clock, indicators...) */
    trailing?: ReactNode;
};

type WindowControl = {
    id: 'close' | 'minimize' | 'maximize';
    label: string;
    onClick: () => void;
};

const ControlIcon = ({ id }: Pick<WindowControl, 'id'>) => {
    switch (id) {
        case 'close':
            return <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" />;
        case 'minimize':
            return <path d="M2 5h6" />;
        case 'maximize':
            return <path d="M2 2h6v6H2z" />;
    }
};

export const WindowBar = ({ title, trailing }: WindowBarProps) => {
    const { platform, closeWindow, minimizeWindow, toggleMaximizeWindow } =
        window.bridgeAPI;
    const isMac = platform === 'darwin';

    const close: WindowControl = {
        id: 'close',
        label: 'Close window',
        onClick: closeWindow,
    };
    const minimize: WindowControl = {
        id: 'minimize',
        label: 'Minimize window',
        onClick: minimizeWindow,
    };
    const maximize: WindowControl = {
        id: 'maximize',
        label: isMac ? 'Toggle full screen' : 'Maximize window',
        onClick: toggleMaximizeWindow,
    };

    // macOS: traffic lights on the left (close, minimize, zoom).
    // Elsewhere: minimize, maximize, close on the right.
    const controls = isMac
        ? [close, minimize, maximize]
        : [minimize, maximize, close];

    const controlsElement = (
        <div className={styles.controls}>
            {controls.map(({ id, label, onClick }) => (
                <button
                    key={id}
                    type="button"
                    className={styles.control}
                    data-control={id}
                    aria-label={label}
                    onClick={onClick}
                >
                    <svg
                        className={styles.icon}
                        viewBox="0 0 10 10"
                        aria-hidden="true"
                    >
                        <ControlIcon id={id} />
                    </svg>
                </button>
            ))}
        </div>
    );

    return (
        <header
            className={styles.windowBar}
            data-platform={isMac ? 'mac' : 'default'}
        >
            {isMac && controlsElement}
            <span className={styles.title}>{title}</span>
            <div className={styles.trailing}>{trailing}</div>
            {!isMac && controlsElement}
        </header>
    );
};
