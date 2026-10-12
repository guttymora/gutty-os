// Smoke test for the packaged app (run after `electron-forge package`).
// Launches the real executable from out/, with fuses and asar applied, and
// checks over the Chrome DevTools Protocol that the UI actually rendered.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const { productName } = JSON.parse(
    readFileSync(path.join(ROOT, 'package.json'), 'utf8')
);
const PORT = 9400 + Math.floor(Math.random() * 500);
const TIMEOUT_MS = 20_000;

const executablePath = () => {
    const outDir = path.join(
        ROOT,
        'out',
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
            socket.close();
            resolve(result?.result?.value);
        };
        socket.onerror = () => reject(new Error('DevTools connection failed'));
    });

const waitForUi = async (page) => {
    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
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
        await sleep(250);
    }
    throw new Error('The renderer loaded but React never rendered');
};

const main = async () => {
    const executable = executablePath();
    if (!existsSync(executable)) {
        throw new Error(
            `Packaged app not found at ${executable}. Run electron-forge package first.`
        );
    }

    const userDataDir = mkdtempSync(path.join(tmpdir(), 'gutty-os-smoke-'));
    const child = spawn(
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

main().catch((error) => {
    console.error(`✘ ${error.message}`);
    process.exit(1);
});
