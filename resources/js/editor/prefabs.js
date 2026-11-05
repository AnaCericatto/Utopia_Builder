import { ITEMS, footprintOf } from './catalog';

// all cells of a box, bottom layer first
const fill = (id, [x0, y0, z0], [x1, y1, z1]) => {
    const out = [];
    for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++)
            for (let z = z0; z <= z1; z++) out.push([x, y, z, id, 0]);
    return out;
};

// only the outer wall cells of a box
const walls = (id, a, b) => fill(id, a, b).filter(([x, , z]) => x === a[0] || x === b[0] || z === a[2] || z === b[2]);

function make(id, name, items) {
    let w = 0, h = 0, d = 0;
    for (const [x, y, z, itemId, rot] of items) {
        const [fw, fh, fd] = footprintOf(ITEMS[itemId], rot);
        w = Math.max(w, x + fw);
        h = Math.max(h, y + fh);
        d = Math.max(d, z + fd);
    }
    return { id, name, items, size: [w, h, d] };
}

// ---- small house: 5 x 5, walls 3 high, flat roof, door + porch step on the +z side ----
const houseWalls = walls('brick_block', [0, 0, 0], [4, 2, 4])
    .filter(([x, y, z]) => !(x === 2 && z === 4 && y < 2)) // door opening, 2 high
    .map(([x, y, z, id, rot]) => {
        const window = y === 1 && ((z === 2 && (x === 0 || x === 4)) || (z === 4 && (x === 1 || x === 3)));
        return window ? [x, y, z, 'glass_block', rot] : [x, y, z, id, rot];
    });
const house = [...houseWalls, ...fill('roof_block', [0, 3, 0], [4, 3, 4]), [2, 0, 5, 'stone_stairs', 0]];

// ---- tree: 3 high trunk, leafy top ----
const tree = [
    ...fill('wood_block', [1, 0, 1], [1, 2, 1]),
    ...fill('grass_block', [0, 3, 0], [2, 3, 2]),
    ...fill('grass_block', [1, 4, 1], [1, 4, 1]),
];

// ---- fence: 5 wide, posts taller than the rail ----
const fence = [...fill('wood_block', [0, 0, 0], [4, 0, 0]), ...[0, 2, 4].map((x) => [x, 1, 0, 'wood_block', 0])];

// ---- garden set: two benches and a lamp post ----
const garden = [
    [0, 0, 0, 'bench', 0],
    [0, 0, 2, 'bench', 2],
    [3, 0, 1, 'lamp_post', 0],
];

export const PREFABS = [
    make('small_house', 'Small house', house),
    make('tree', 'Tree', tree),
    make('fence', 'Fence (5 wide)', fence),
    make('garden_set', 'Garden set', garden),
];

// Rotate a whole prefab by quarter turns. Positions turn around the prefab, and each item also
// gets +1 rotation per turn, so stairs and benches keep facing the same way relative to the prefab.
export function rotateItems(items, [w, d], times) {
    let list = items;
    const n = ((times % 4) + 4) % 4;
    for (let t = 0; t < n; t++) {
        list = list.map(([x, y, z, id, rot]) => {
            const fd = footprintOf(ITEMS[id], rot)[2];
            return [d - (z + fd), y, x, id, (rot + 1) % 4];
        });
        const tmp = w;
        w = d;
        d = tmp;
    }
    return list;
}

// entries ready for addMany: [x, y, z, paletteIndex, rotation], with the prefab's minimum corner at the given cell
export function prefabEntries(prefab, [ox, oz], y0, rotation, palette) {
    const [w, , d] = prefab.size;
    return rotateItems(prefab.items, [w, d], rotation).flatMap(([x, y, z, id, rot]) => {
        const idx = palette.indexOf(id);
        return idx < 0 ? [] : [[ox + x, y0 + y, oz + z, idx, rot]];
    });
}