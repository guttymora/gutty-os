import { artToRects } from './art-to-rects';
import { type IconName, icons } from './icons';

type PixelIconProps = {
    name: IconName;
    /** Size of one art pixel in CSS pixels */
    scale?: number;
    className?: string;
};

export const PixelIcon = ({ name, scale = 2, className }: PixelIconProps) => {
    const art = icons[name];
    const width = art.rows[0].length;
    const height = art.rows.length;

    return (
        <svg
            className={className}
            width={width * scale}
            height={height * scale}
            viewBox={`0 0 ${width} ${height}`}
            shapeRendering="crispEdges"
            aria-hidden="true"
        >
            {artToRects(art).map(({ x, y, width: runWidth, color }) => (
                <rect
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    width={runWidth}
                    height={1}
                    // style (not the fill attribute) so CSS variables resolve
                    style={{ fill: color }}
                />
            ))}
        </svg>
    );
};
