// Smoke test for the packaged app (run after `electron-forge package`).
// Launches the real executable from out/, with fuses and asar applied, and
// checks over the Chrome DevTools Protocol that the UI actually rendered.
// Always removes out/ when done, pass or fail.
import { spawn } from 'node:child_process';
import {
    existsSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const { productName } = JSON.parse(
    readFileSync(path.join(ROOT, 'package.json'), 'utf8')
);
const OUT_DIR = path.join(ROOT, 'out');
const PORT = 9400 + Math.floor(Math.random() * 500);
const TIMEOUT_MS = 20_000;
const EVALUATE_TIMEOUT_MS = 5_000;
// Hard limit for the whole run, so a stuck app can never hang CI
const WATCHDOG_MS = 60_000;

/** The packaged app process, so the watchdog can kill it too */
let child;

const executablePath = () => {
    const outDir = path.join(
        OUT_DIR,
        `${productName}-${process.platform}-${process.arch}`
    );
    switch (process.platform) {
        case 'darwin':
            return path.join(
                outDir,
                `${productName}.app/Contents/MacOS/${productName}`
            );
        case 'win32':
            return path.join(outDir, `${productName}.exe`);
        default:
            return path.join(outDir, productName);
    }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findPage = async () => {
    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
        try {
            const targets = await (
                await fetch(`http://127.0.0.1:${PORT}/json`)
            ).json();
            const page = targets.find((target) => target.type === 'page');
            if (page) {
                return page;
            }
        } catch {
            // App still starting
        }
        await sleep(250);
    }
    throw new Error('The packaged app never opened a window');
};

const evaluate = (page, expression) =>
    new Promise((resolve, reject) => {
        const socket = new WebSocket(page.webSocketDebuggerUrl);
        let settled = false;
        const settle = (callback, value) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            socket.close();
            callback(value);
        };
        const timer = setTimeout(
            () => settle(reject, new Error('DevTools did not answer in time')),
            EVALUATE_TIMEOUT_MS
        );

        socket.onopen = () =>
            socket.send(
                JSON.stringify({
                    id: 1,
                    method: 'Runtime.evaluate',
                    params: { expression, returnByValue: true },
                })
            );
        socket.onmessage = (event) => {
            const { result } = JSON.parse(event.data);
            settle(resolve, result?.result?.value);
        };
        socket.onerror = () =>
            settle(reject, new Error('DevTools connection failed'));
        socket.onclose = () =>
            settle(reject, new Error('DevTools connection closed early'));
    });

const waitForUi = async (page) => {
    const deadline = Date.now() + TIMEOUT_MS;
    let lastError;
    while (Date.now() < deadline) {
        try {
            const state = await evaluate(
                page,
                `({
                    url: location.href,
                    title: document.title,
                    rendered: document.getElementById('root')?.childElementCount > 0,
                    palette: document.documentElement.dataset.palette,
                })`
            );
            if (state?.rendered) {
                return state;
            }
        } catch (error) {
            // DevTools can hiccup while the app boots: retry until the deadline
            lastError = error;
        }
        await sleep(250);
    }
    throw new Error(
        `The renderer loaded but React never rendered${
            lastError ? ` (last error: ${lastError.message})` : ''
        }`
    );
};

const main = async () => {
    const executable = executablePath();
    if (!existsSync(executable)) {
        throw new Error(
            `Packaged app not found at ${executable}. Run electron-forge package first.`
        );
    }

    const userDataDir = mkdtempSync(path.join(tmpdir(), 'gutty-os-smoke-'));
    // Keep the game library inside the temp folder (never create ~/gutty-os)
    writeFileSync(
        path.join(userDataDir, 'settings.json'),
        JSON.stringify({
            version: 1,
            libraryPath: path.join(userDataDir, 'library'),
        })
    );
    child = spawn(
        executable,
        [`--remote-debugging-port=${PORT}`, `--user-data-dir=${userDataDir}`],
        { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    const exited = new Promise((resolve) => child.on('exit', resolve));

    try {
        const page = await Promise.race([
            findPage(),
            exited.then((code) => {
                throw new Error(`The packaged app exited early (code ${code})`);
            }),
        ]);
        const state = await waitForUi(page);

        if (!state.url.startsWith('file://')) {
            throw new Error(`Expected the bundled renderer, got ${state.url}`);
        }
        if (!state.palette) {
            throw new Error('No color palette was applied');
        }

        console.log(
            `✔ Packaged app rendered (${state.title}, palette: ${state.palette})`
        );
    } catch (error) {
        console.error(output.trim());
        throw error;
    } finally {
        child.kill();
        await exited;
        rmSync(userDataDir, { recursive: true, force: true });
    }
};

const watchdog = setTimeout(() => {
    console.error(`✘ Smoke test timed out after ${WATCHDOG_MS / 1000}s`);
    child?.kill('SIGKILL');
    rmSync(OUT_DIR, { recursive: true, force: true });
    process.exit(1);
}, WATCHDOG_MS);

main()
    .catch((error) => {
        console.error(`✘ ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => {
        clearTimeout(watchdog);
        rmSync(OUT_DIR, { recursive: true, force: true });
    });
