export type LaunchErrorReason =
    | 'library-unavailable'
    | 'game-not-found'
    | 'emulator-not-found'
    | 'already-playing'
    /** The library is being moved */
    | 'busy'
    | 'failed';

export type LaunchResult =
    { ok: true } | { ok: false; reason: LaunchErrorReason };
