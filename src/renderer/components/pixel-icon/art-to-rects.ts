export type PixelArt = {
    /** One string per row; each char is a pixel key, '.' is transparent */
    rows: string[];
    /** Maps pixel keys to CSS colors */
    palette: Record<string, string>;
};

export type PixelRect = {
    x: number;
    y: number;
    width: number;
    color: string;
};

/**
 * Converts pixel art into SVG rects, merging horizontal runs of the same
 * color so an icon renders with as few elements as possible.
 */
export const artToRects = ({ rows, palette }: PixelArt): PixelRect[] => {
    const width = rows[0]?.length ?? 0;
    const rects: PixelRect[] = [];

    rows.forEach((row, y) => {
        if (row.length !== width) {
            throw new Error(
                `Pixel art row ${y} has ${row.length} pixels, expected ${width}`
            );
        }

        let x = 0;
        while (x < row.length) {
            const key = row[x];
            let runEnd = x + 1;
            while (row[runEnd] === key) {
                runEnd++;
            }

            if (key !== '.') {
                const color = palette[key];
                if (!color) {
                    throw new Error(`Pixel art key "${key}" has no color`);
                }
                rects.push({ x, y, width: runEnd - x, color });
            }

            x = runEnd;
        }
    });

    return rects;
};
