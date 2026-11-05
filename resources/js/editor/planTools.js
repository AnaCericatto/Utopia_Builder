import { ITEMS, cellsOf, cellKey, buildOccupancy } from './catalog';

// straight line of [x, z] cells between two cells (Bresenham)
export function bresenham([x0, z0], [x1, z1]) {
    const cells = [];
    const dx = Math.abs(x1 - x0);
    const dz = Math.abs(z1 - z0);
    const sx = x0 < x1 ? 1 : -1;
    const sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;
    let x = x0;
    let z = z0;
    for (;;) {
        cells.push([x, z]);
        if (x === x1 && z === z1) break;
        const e2 = 2 * err;
        if (e2 > -dz) { err -= dz; x += sx; }
        if (e2 < dx) { err += dx; z += sz; }
    }
    return cells;
}

// [x, z] cells of a rectangle between two corners, filled or just the outline
export function rectCells([x0, z0], [x1, z1], hollow) {
    const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
    const za = Math.min(z0, z1), zb = Math.max(z0, z1);
    const out = [];
    for (let x = xa; x <= xb; x++) {
        for (let z = za; z <= zb; z++) {
            if (!hollow || x === xa || x === xb || z === za || z === zb) out.push([x, z]);
        }
    }
    return out;
}

// repeat a set of cells upward to make walls; entries are [x, y, z, paletteIndex, rotation], bottom layer first
export function levelEntries(cells, y0, itemIdx, rot, def, wallHeight) {
    const h = def.size[1];
    const levels = Math.max(1, Math.floor(wallHeight / h));
    const out = [];
    for (let k = 0; k < levels; k++) {
        for (const [x, z] of cells) out.push([x, y0 + k * h, z, itemIdx, rot]);
    }
    return out;
}

// Which entries can be placed? Each one is checked against the build AND the entries before it.
// results[i] says whether entries[i] fits; placed is the list of the ones that do.
export function resolveEntries(blocks, palette, size, entries, max) {
    const occupied = buildOccupancy(blocks, palette);
    const placed = [];
    const results = entries.map((e) => {
        if (blocks.length + placed.length >= max) return false;
        const def = ITEMS[palette[e[3]]];
        if (!def) return false;
        const cells = cellsOf(def, e[4] ?? 0, e);
        const ok = cells.every(
            ([x, y, z]) =>
                x >= 0 && y >= 0 && z >= 0 && x < size[0] && y < size[1] && z < size[2] && !occupied.has(cellKey(x, y, z)),
        );
        if (!ok) return false;
        cells.forEach(([x, y, z]) => occupied.set(cellKey(x, y, z), -1));
        placed.push(e);
        return true;
    });
    return { placed, results };
}