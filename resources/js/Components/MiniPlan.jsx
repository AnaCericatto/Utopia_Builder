import { useEffect, useRef } from 'react';

// Draws the server's top-down preview: one coloured square per column, darker where it is lower.
export default function MiniPlan({ preview, size = 220 }) {
    const ref = useRef(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        const g = canvas.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = '#e8edf3';
        g.fillRect(0, 0, size, size);

        const { w, d, colors, cells, heights, maxHeight } = preview;
        if (!w || !d) return;

        const cell = Math.min(size / w, size / d) * 0.92;
        const ox = (size - w * cell) / 2;
        const oz = (size - d * cell) / 2;

        for (let z = 0; z < d; z++) {
            for (let x = 0; x < w; x++) {
                const i = z * w + x;
                if (!cells[i]) continue;
                const px = ox + x * cell;
                const pz = oz + z * cell;
                g.fillStyle = colors[cells[i] - 1];
                g.fillRect(px, pz, cell + 0.6, cell + 0.6);
                const shade = maxHeight > 1 ? 0.4 * (1 - heights[i] / maxHeight) : 0;
                if (shade > 0) {
                    g.fillStyle = `rgba(0,0,0,${shade})`;
                    g.fillRect(px, pz, cell + 0.6, cell + 0.6);
                }
            }
        }
    }, [preview, size]);

    return <canvas ref={ref} style={{ width: '100%', aspectRatio: '1 / 1', display: 'block', borderRadius: 6 }} />;
}