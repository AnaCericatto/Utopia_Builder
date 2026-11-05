import items from '../../catalog/items.json';

export const ITEMS = items;
export const ITEM_IDS = Object.keys(items);

export const cellKey = (x, y, z) => `${x},${y},${z}`;

// footprint [w, h, d] after rotating 0-3 quarter turns
export const footprintOf = (item, rot) =>
    rot % 2 ? [item.size[2], item.size[1], item.size[0]] : item.size;

// every cell an item covers. origin = the footprint's minimum corner.
export function cellsOf(item, rot, [x, y, z]) {
    const [w, h, d] = footprintOf(item, rot);
    const cells = [];
    for (let i = 0; i < w; i++)
        for (let j = 0; j < h; j++)
            for (let k = 0; k < d; k++) cells.push([x + i, y + j, z + k]);
    return cells;
}

// cell -> index of the block that covers it
export function buildOccupancy(blocks, palette) {
    const map = new Map();
    blocks.forEach((b, i) => {
        const item = ITEMS[palette[b[3]]];
        if (!item) return;
        for (const [x, y, z] of cellsOf(item, b[4] ?? 0, b)) map.set(cellKey(x, y, z), i);
    });
    return map;
}