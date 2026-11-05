import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, MAX_BLOCKS } from './store';
import { ITEMS, footprintOf, buildOccupancy, cellsOf, cellKey } from './catalog';
import { PREFABS, prefabEntries } from './prefabs';
import { bresenham, rectCells, levelEntries, resolveEntries } from './planTools';

// which way an item faces on the plan for rotation 0..3, as [dx, dz]
const DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]];
const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const TOOLS = [
    ['pencil', 'Pencil'],
    ['line', 'Wall line'],
    ['rect', 'Rectangle'],
    ['erase', 'Eraser'],
    ['stamp', 'Stamp'],
];

const ui = {
    root: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', fontSize: 14 },
    bar: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '6px 10px', background: '#fff', borderBottom: '1px solid #ddd' },
    btn: { padding: '4px 10px', border: '1px solid #bbb', borderRadius: 6, background: '#f8f8f8', cursor: 'pointer' },
    btnOn: { padding: '4px 10px', border: '1px solid #2563eb', borderRadius: 6, background: '#dbeafe', cursor: 'pointer' },
    scroll: { flex: 1, overflow: 'auto', background: '#cbd5e1', padding: 12 },
    status: { padding: '4px 10px', fontSize: 12, color: '#475569', background: '#fff', borderTop: '1px solid #ddd' },
};

export default function Plan() {
    const blocks = useEditor((s) => s.blocks);
    const palette = useEditor((s) => s.palette);
    const size = useEditor((s) => s.size);
    const layer = useEditor((s) => s.layer);
    const setLayer = useEditor((s) => s.setLayer);
    const item = useEditor((s) => s.item);
    const rotation = useEditor((s) => s.rotation);
    const rotate = useEditor((s) => s.rotate);
    const addMany = useEditor((s) => s.addMany);
    const removeMany = useEditor((s) => s.removeMany);
    const undo = useEditor((s) => s.undo);
    const redo = useEditor((s) => s.redo);
    const canUndo = useEditor((s) => s.past.length > 0);
    const canRedo = useEditor((s) => s.future.length > 0);

    const [ptool, setPtool] = useState('pencil');
    const [hollow, setHollow] = useState(true);
    const [wallH, setWallH] = useState(3);
    const [prefabId, setPrefabId] = useState(PREFABS[0].id);
    const [cs, setCs] = useState(20);       // pixels per cell
    const [hover, setHover] = useState(null); // [x, z]
    const [drag, setDrag] = useState(null);   // { tool, start, cur, path }
    const [note, setNote] = useState('');
    const canvasRef = useRef(null);

    const def = ITEMS[palette[item]];
    const single = !!def && def.size[0] === 1 && def.size[2] === 1; // line and rectangle tools need a 1x1 footprint
    const prefab = PREFABS.find((p) => p.id === prefabId);
    const occupied = useMemo(() => buildOccupancy(blocks, palette), [blocks, palette]);

    const flash = (msg) => {
        setNote(msg);
        setTimeout(() => setNote(''), 2200);
    };

    // what a pencil / line / rectangle gesture would place
    const planEntries = (d) => {
        if (!d || !def) return [];
        if (d.tool === 'pencil') return d.path.map(([x, z]) => [x, layer, z, item, rotation]);
        if (d.tool === 'line' && single) return levelEntries(bresenham(d.start, d.cur), layer, item, rotation, def, wallH);
        if (d.tool === 'rect' && single) return levelEntries(rectCells(d.start, d.cur, hollow), layer, item, rotation, def, wallH);
        return [];
    };

    // ---------- previews (computed on each render, drawn by the effect below) ----------
    const drawTools = ['pencil', 'line', 'rect'];
    const gesture = drag ?? (hover ? { tool: ptool, start: hover, cur: hover, path: [hover] } : null);
    const previewEntries = gesture && drawTools.includes(gesture.tool) ? planEntries(gesture) : [];
    const previewResults = previewEntries.length
        ? resolveEntries(blocks, palette, size, previewEntries, MAX_BLOCKS).results
        : [];

    const eraseCells = drag?.tool === 'erase' ? drag.path : !drag && ptool === 'erase' && hover ? [hover] : [];

    let stampCells = [];
    let stampOk = true;
    if (ptool === 'stamp' && hover && prefab && !drag) {
        const entries = prefabEntries(prefab, hover, layer, rotation, palette);
        stampOk = resolveEntries(blocks, palette, size, entries, MAX_BLOCKS).results.every(Boolean);
        const seen = new Set();
        entries.forEach((e) => {
            for (const [x, , z] of cellsOf(ITEMS[palette[e[3]]], e[4], e)) seen.add(`${x},${z}`);
        });
        stampCells = [...seen].map((k) => k.split(',').map(Number));
    }

    // ---------- drawing ----------
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const W = size[0] * cs;
        const H = size[2] * cs;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;
        const g = canvas.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = '#f8fafc';
        g.fillRect(0, 0, W, H);

        // pass 0: the layer below, faded (only things that don't reach this layer); pass 1: this layer
        for (const pass of [0, 1]) {
            const y = pass === 0 ? layer - 1 : layer;
            if (y < 0) continue;
            for (const b of blocks) {
                const it = ITEMS[palette[b[3]]];
                if (!it) continue;
                const rot = b[4] ?? 0;
                const [fw, fh, fd] = footprintOf(it, rot);
                if (b[1] > y || y >= b[1] + fh) continue;
                if (pass === 0 && b[1] + fh > layer) continue;

                const rx = b[0] * cs, ry = b[2] * cs, rw = fw * cs, rh = fd * cs;
                g.globalAlpha = pass === 0 ? 0.25 : b[1] < layer ? 0.6 : 1; // 0.6 = continues from a layer below
                g.fillStyle = it.color;
                g.fillRect(rx, ry, rw, rh);
                g.strokeStyle = 'rgba(15,23,42,.55)';
                g.lineWidth = 1;
                g.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

                if (pass === 1 && it.kind === 'prop') {
                    const cx = rx + rw / 2, cy = ry + rh / 2;
                    g.fillStyle = 'rgba(15,23,42,.85)';
                    g.font = `${Math.max(9, cs * 0.42)}px system-ui, sans-serif`;
                    g.textAlign = 'center';
                    g.textBaseline = 'middle';
                    g.fillText(initials(it.name), cx, cy);
                    // little arrow showing which way the item faces
                    const [dx, dz] = DIRS[rot];
                    const half = dx ? rw / 2 : rh / 2;
                    const tx = cx + dx * (half - 2), ty = cy + dz * (half - 2);
                    const bx = tx - dx * cs * 0.28, by = ty - dz * cs * 0.28;
                    g.beginPath();
                    g.moveTo(tx, ty);
                    g.lineTo(bx + dz * cs * 0.18, by + dx * cs * 0.18);
                    g.lineTo(bx - dz * cs * 0.18, by - dx * cs * 0.18);
                    g.closePath();
                    g.fill();
                }
            }
        }
        g.globalAlpha = 1;

        // grid (every 4th line stronger)
        g.lineWidth = 1;
        for (let i = 0; i <= size[0]; i++) {
            g.strokeStyle = i % 4 === 0 ? 'rgba(15,23,42,.30)' : 'rgba(15,23,42,.10)';
            g.beginPath(); g.moveTo(i * cs + 0.5, 0); g.lineTo(i * cs + 0.5, H); g.stroke();
        }
        for (let j = 0; j <= size[2]; j++) {
            g.strokeStyle = j % 4 === 0 ? 'rgba(15,23,42,.30)' : 'rgba(15,23,42,.10)';
            g.beginPath(); g.moveTo(0, j * cs + 0.5); g.lineTo(W, j * cs + 0.5); g.stroke();
        }

        // previews: green = fits, red = blocked
        previewEntries.forEach((e, i) => {
            if (e[1] !== layer) return; // only the bottom level of a wall is shown
            const it = ITEMS[palette[e[3]]];
            if (!it) return;
            const [fw, , fd] = footprintOf(it, e[4]);
            g.fillStyle = previewResults[i] ? 'rgba(34,197,94,.5)' : 'rgba(239,68,68,.55)';
            g.fillRect(e[0] * cs, e[2] * cs, fw * cs, fd * cs);
        });
        eraseCells.forEach(([x, z]) => {
            g.fillStyle = 'rgba(239,68,68,.3)';
            g.fillRect(x * cs, z * cs, cs, cs);
            g.strokeStyle = '#ef4444';
            g.lineWidth = 2;
            g.strokeRect(x * cs + 1, z * cs + 1, cs - 2, cs - 2);
        });
        stampCells.forEach(([x, z]) => {
            g.fillStyle = stampOk ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.45)';
            g.fillRect(x * cs, z * cs, cs, cs);
        });
        if (hover) {
            g.strokeStyle = '#2563eb';
            g.lineWidth = 2;
            g.strokeRect(hover[0] * cs + 1, hover[1] * cs + 1, cs - 2, cs - 2);
        }
    }); // runs after every render; renders only happen when something changes

    // ---------- mouse ----------
    const cellOf = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = Math.floor((e.clientX - r.left) / cs);
        const z = Math.floor((e.clientY - r.top) / cs);
        return x < 0 || z < 0 || x >= size[0] || z >= size[2] ? null : [x, z];
    };

    const placeStamp = (c) => {
        if (!prefab) return;
        const placed = addMany(prefabEntries(prefab, c, layer, rotation, palette), true);
        if (!placed) flash("The prefab doesn't fit there (something is in the way or it leaves the grid).");
    };

    const onDown = (e) => {
        if (e.button !== 0 && e.button !== 2) return;
        const c = cellOf(e);
        if (!c) return;
        const tool = e.button === 2 ? 'erase' : ptool; // right button always erases
        if (tool === 'stamp') {
            placeStamp(c);
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ tool, start: c, cur: c, path: [c] });
    };

    const onMove = (e) => {
        const c = cellOf(e);
        setHover((prev) => (prev === c || (prev && c && prev[0] === c[0] && prev[1] === c[1]) ? prev : c));
        if (!drag || !c) return;
        setDrag((d) => {
            if (!d || (d.cur[0] === c[0] && d.cur[1] === c[1])) return d;
            const freehand = d.tool === 'pencil' || d.tool === 'erase';
            // fill the gap if the mouse moved several cells at once
            return { ...d, cur: c, path: freehand ? [...d.path, ...bresenham(d.cur, c).slice(1)] : d.path };
        });
    };

    const onUp = () => {
        if (!drag) return;
        const d = drag;
        setDrag(null);
        if (d.tool === 'erase') {
            const hit = new Set();
            for (const [x, z] of d.path) {
                const bi = occupied.get(cellKey(x, layer, z));
                if (bi !== undefined) hit.add(bi);
            }
            removeMany([...hit]);
            return;
        }
        const entries = planEntries(d);
        if (entries.length && !addMany(entries)) flash('Nothing could be placed there.');
    };

    const needsSingle = (ptool === 'line' || ptool === 'rect') && !single;

    return (
        <div style={ui.root}>
            <div style={ui.bar}>
                {TOOLS.map(([k, label]) => (
                    <button key={k} style={ptool === k ? ui.btnOn : ui.btn} onClick={() => setPtool(k)}>{label}</button>
                ))}
                {ptool === 'rect' && (
                    <label><input type="checkbox" checked={hollow} onChange={(e) => setHollow(e.target.checked)} /> hollow</label>
                )}
                {(ptool === 'line' || ptool === 'rect') && (
                    <label>
                        height{' '}
                        <input
                            type="number" min={1} max={16} value={wallH} style={{ width: 52 }}
                            onChange={(e) => setWallH(Math.max(1, Math.min(16, Number(e.target.value) || 1)))}
                        />
                    </label>
                )}
                {ptool === 'stamp' && (
                    <select value={prefabId} onChange={(e) => setPrefabId(e.target.value)}>
                        {PREFABS.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.size.join('×')})</option>
                        ))}
                    </select>
                )}
                <button style={ui.btn} onClick={rotate}>Rotate (R) {rotation * 90}°</button>
                <span>Layer {layer}</span>
                <input type="range" min={0} max={size[1] - 1} value={layer} onChange={(e) => setLayer(Number(e.target.value))} />
                <button style={ui.btn} disabled={!canUndo} onClick={undo}>Undo</button>
                <button style={ui.btn} disabled={!canRedo} onClick={redo}>Redo</button>
                <button style={ui.btn} onClick={() => setCs((c) => Math.max(8, c - 4))}>−</button>
                <button style={ui.btn} onClick={() => setCs((c) => Math.min(40, c + 4))}>+</button>
                {needsSingle && <span style={{ color: '#b91c1c' }}>Pick a 1×1 item (blocks, stairs, lamp post) for this tool.</span>}
                {note && <span style={{ color: '#b91c1c' }}>{note}</span>}
            </div>

            <div style={ui.scroll}>
                <canvas
                    ref={canvasRef}
                    style={{ display: 'block', touchAction: 'none', cursor: 'crosshair', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }}
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={() => setDrag(null)}
                    onPointerLeave={() => { if (!drag) setHover(null); }}
                    onContextMenu={(e) => e.preventDefault()}
                />
            </div>

            <div style={ui.status}>
                Layer {layer} from above (top of the screen = back, bottom = front) · faded = the layer below · lighter = continues from a layer below
                {hover ? ` · x ${hover[0]}, z ${hover[1]}` : ''}
                {' · '}left-drag draws, right-drag erases, R rotates
            </div>
        </div>
    );
}