import { PixelIcon } from '@components/pixel-icon/pixel-icon';
import { PLATFORM_FILTERS, type PlatformFilter } from '@data/platforms';

import styles from './platform-sidebar.module.css';

type PlatformSidebarProps = {
    selected: PlatformFilter;
    onSelect: (filter: PlatformFilter) => void;
};

export const PlatformSidebar = ({
    selected,
    onSelect,
}: PlatformSidebarProps) => (
    <nav className={styles.sidebar} aria-label="Platforms">
        <ul className={styles.list}>
            {PLATFORM_FILTERS.map(({ id, label, icon }) => (
                <li key={id}>
                    <button
                        type="button"
                        className={styles.item}
                        aria-current={id === selected ? 'true' : undefined}
                        onClick={() => onSelect(id)}
                    >
                        <span className={styles.icon}>
                            <PixelIcon name={icon} scale={2} />
                        </span>
                        {label}
                    </button>
                </li>
            ))}
        </ul>
    </nav>
);
