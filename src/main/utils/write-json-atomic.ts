import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Writes JSON to a temporary file and renames it over the target, so a crash
 * mid-write never leaves a half-written (corrupted) file behind.
 */
export const writeJsonAtomic = async (filePath: string, data: unknown) => {
    await mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(data, null, 4)}\n`, 'utf8');
    await rename(tempPath, filePath);
};
