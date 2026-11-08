import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type Mock,
    vi,
} from 'vitest';

import type { LaunchCommand } from './emulators';
import { GameSession } from './game-session';

const STARTED = new Date('2026-11-08T20:00:00.000Z');
const ENDED = new Date('2026-11-08T20:42:00.000Z');

describe('GameSession', () => {
    let sandbox: string;
    let command: LaunchCommand;
    let child: EventEmitter;
    let spawn: Mock<(...args: unknown[]) => ChildProcess>;
    let now: Mock<() => Date>;
    let session: GameSession;

    beforeEach(async () => {
        sandbox = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
        const binary = path.join(sandbox, 'mGBA');
        await writeFile(binary, '#!/bin/sh\n');
        await chmod(binary, 0o755);
        command = { command: binary, args: ['game.gba'], env: { A: '1' } };

        child = new EventEmitter();
        // Spawning succeeds on the next tick, like a real process
        spawn = vi.fn(() => {
            setImmediate(() => child.emit('spawn'));
            return child as ChildProcess;
        });
        now = vi.fn().mockReturnValueOnce(STARTED).mockReturnValueOnce(ENDED);
        session = new GameSession({ spawn, now });
    });

    afterEach(async () => {
        await rm(sandbox, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('starts the emulator with the command, args and env', async () => {
        expect(await session.start('id', command, vi.fn())).toEqual({
            ok: true,
        });
        expect(spawn).toHaveBeenCalledWith(command.command, ['game.gba'], {
            A: '1',
        });
        expect(session.isRunning).toBe(true);
    });

    it('reports the session once the emulator quits', async () => {
        const onEnd = vi.fn();
        await session.start('id', command, onEnd);

        child.emit('exit', 0);

        expect(onEnd).toHaveBeenCalledWith({
            gameId: 'id',
            startedAt: STARTED,
            endedAt: ENDED,
        });
        expect(session.isRunning).toBe(false);
    });

    it('runs one game at a time, even while the first is starting', async () => {
        const first = session.start('one', command, vi.fn());

        expect(await session.start('two', command, vi.fn())).toEqual({
            ok: false,
            reason: 'already-playing',
        });
        await first;
        expect(spawn).toHaveBeenCalledOnce();
    });

    it('reports a missing emulator without trying to start it', async () => {
        const missing = { ...command, command: path.join(sandbox, 'nope') };

        expect(await session.start('id', missing, vi.fn())).toEqual({
            ok: false,
            reason: 'emulator-not-found',
        });
        expect(spawn).not.toHaveBeenCalled();
        expect(session.isRunning).toBe(false);
    });

    it('frees the slot when the emulator fails to start', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        spawn.mockImplementationOnce(() => {
            setImmediate(() => child.emit('error', new Error('EACCES')));
            return child as ChildProcess;
        });

        expect(await session.start('id', command, vi.fn())).toEqual({
            ok: false,
            reason: 'failed',
        });
        expect(session.isRunning).toBe(false);
    });
});
