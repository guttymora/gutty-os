import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

/**
 * SHA-1 of a file's contents, read in chunks so memory use stays flat no
 * matter the file size. Used as the game id and to spot duplicates.
 */
export const hashFile = (filePath: string) =>
    new Promise<string>((resolve, reject) => {
        const hash = createHash('sha1');
        createReadStream(filePath)
            .on('data', (chunk) => hash.update(chunk))
            .on('error', reject)
            .on('end', () => resolve(hash.digest('hex')));
    });
