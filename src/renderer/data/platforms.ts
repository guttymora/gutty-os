import type { IconName } from '@components/pixel-icon/icons';
import type { Platform } from '@shared/game';

export type PlatformFilter = Platform | 'all';

type PlatformInfo = {
    /** Sidebar label */
    label: string;
    /** Compact label for badges and details */
    shortLabel: string;
    icon: IconName;
};

export const PLATFORMS: Record<Platform, PlatformInfo> = {
    gb: { label: 'Game Boy', shortLabel: 'GB', icon: 'gameBoy' },
    gbc: { label: 'GB Color', shortLabel: 'GBC', icon: 'gameBoyColor' },
    gba: { label: 'GB Advance', shortLabel: 'GBA', icon: 'gameBoyAdvance' },
};

export const PLATFORM_FILTERS: {
    id: PlatformFilter;
    label: string;
    icon: IconName;
}[] = [
    { id: 'all', label: 'All Games', icon: 'star' },
    ...(Object.keys(PLATFORMS) as Platform[]).map((id) => ({
        id,
        label: PLATFORMS[id].label,
        icon: PLATFORMS[id].icon,
    })),
];
