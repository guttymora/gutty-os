import { type ChildProcess, spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';

import type { LaunchResult } from '@shared/launch';

import type { LaunchCommand } from './emulators';

export type SessionEnd = {
    gameId: string;
    startedAt: Date;
    endedAt: Date;
};

type GameSessionDependencies = {
    spawn?: (
        command: string,
        args: string[],
        env: NodeJS.ProcessEnv
    ) => ChildProcess;
    now?: () => Date;
};

const spawnEmulator = (
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv
) => spawn(command, args, { env, stdio: 'ignore' });

/** Resolves once the process is running, or with the error that stopped it */
const waitForSpawn = (child: ChildProcess) =>
    new Promise<Error | undefined>((resolve) => {
        child.once('spawn', () => resolve(undefined));
        child.once('error', resolve);
    });

/**
 * Runs one game at a time and reports how long it was played once the
 * emulator quits.
 */
export class GameSession {
    private running = false;
    private readonly spawn: NonNullable<GameSessionDependencies['spawn']>;
    private readonly now: () => Date;

    constructor({
        spawn = spawnEmulator,
        now = () => new Date(),
    }: GameSessionDependencies = {}) {
        this.spawn = spawn;
        this.now = now;
    }

    get isRunning() {
        return this.running;
    }

    async start(
        gameId: string,
        { command, args, env }: LaunchCommand,
        onEnd: (end: SessionEnd) => void
    ): Promise<LaunchResult> {
        if (this.running) {
            return { ok: false, reason: 'already-playing' };
        }
        // Take the slot before anything async, so a second press can't start
        // another game
        this.running = true;

        try {
            await access(command, constants.X_OK);
        } catch {
            this.running = false;
            return { ok: false, reason: 'emulator-not-found' };
        }

        const startedAt = this.now();
        const child = this.spawn(command, args, env);
        const error = await waitForSpawn(child);
        if (error) {
            console.error('Could not start the emulator:', error);
            this.running = false;
            return { ok: false, reason: 'failed' };
        }

        child.once('exit', () => {
            this.running = false;
            onEnd({ gameId, startedAt, endedAt: this.now() });
        });

        return { ok: true };
    }
}
