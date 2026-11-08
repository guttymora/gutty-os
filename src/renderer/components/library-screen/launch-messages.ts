import type { LaunchErrorReason } from '@shared/launch';

export const LAUNCH_ERROR_MESSAGES: Record<LaunchErrorReason, string> = {
    'library-unavailable': "Your game library isn't available",
    'game-not-found': "This game's ROM wasn't found in your library",
    'emulator-not-found': 'mGBA was not found. Move it to Applications',
    'already-playing': 'A game is already running',
    busy: 'Your library is being moved. Try again when it is done',
    failed: "Couldn't start the game",
};
