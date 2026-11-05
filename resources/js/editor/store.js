import { create } from 'zustand';
import { ITEMS, ITEM_IDS, buildOccupancy, cellKey, cellsOf } from './catalog';
import { resolveEntries } from './planTools';

export const SIZE = [32, 16, 32];   // fixed grid for the MVP (the server allows up to 64)
export const MAX_BLOCKS = 20000;    // must match config/builds.php
export const MAX_STEPS = 100;
const HISTORY_LIMIT = 100;

const snap = (s) => ({ blocks: s.blocks, steps: s.steps });

// v1 builds used colour names; v2 uses catalog ids plus a rotation per block
function migrate(data) {
    if (!data) return { palette: [], blocks: [] };
    if (data.version === 1) {
        return {
            palette: (data.palette ?? []).map((n) => `${n}_block`),
            blocks: (data.blocks ?? []).map(([x, y, z, p]) => [x, y, z, p, 0]),
        };
    }
    return { palette: data.palette ?? [], blocks: data.blocks ?? [] };
}

// what we send to the server: only the items actually used, so the palette stays small
export function serializeBuild({ size, palette, blocks }) {
    const used = [...new Set(blocks.map((b) => b[3]))].sort((a, b) => a - b);
    const remap = new Map(used.map((old, i) => [old, i]));
    return {
        version: 2,
        size,
        palette: used.length ? used.map((i) => palette[i]) : [palette[0]],
        blocks: blocks.map(([x, y, z, i, r]) => [x, y, z, remap.get(i), r ?? 0]),
    };
}

export const useEditor = create((set, get) => ({
    size: SIZE,
    palette: ITEM_IDS,     // item ids; a block stores its index into this list
    blocks: [],            // [[x, y, z, itemIndex, rotation], ...] in placement order
    steps: [],             // [{ title, note, end_index }]
    past: [],
    future: [],
    tool: 'place',         // 'place' | 'remove'
    item: 0,               // selected index in palette
    rotation: 0,           // 0-3 quarter turns
    layer: 0,
    showAbove: true,

    load: (data, steps) => {
        const m = migrate(data);
        const saved = m.palette;
        // saved items first (so indices stay stable), then any items added to the catalog since
        const palette = [...saved.filter((id) => ITEMS[id]), ...ITEM_IDS.filter((id) => !saved.includes(id))];

        // drop blocks whose item no longer exists, and keep the steps' cut points correct
        const kept = [];
        const prefix = [0];
        m.blocks.forEach((b) => {
            const ni = palette.indexOf(saved[b[3]]);
            if (ni >= 0) kept.push([b[0], b[1], b[2], ni, b[4] ?? 0]);
            prefix.push(kept.length);
        });
        const fixedSteps = (steps ?? []).map((s) => ({
            ...s,
            end_index: prefix[Math.min(s.end_index, m.blocks.length)],
        }));

        set({
            palette,
            blocks: kept,
            steps: fixedSteps,
            past: [],
            future: [],
            item: 0,
            rotation: 0,
            layer: 0,
            showAbove: true,
            tool: 'place',
        });
    },

    // every undoable change goes through here
    commit: (blocks, steps) =>
        set((s) => ({
            past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snap(s)],
            future: [],
            blocks,
            steps,
        })),

    undo: () =>
        set((s) => {
            if (!s.past.length) return s;
            const prev = s.past[s.past.length - 1];
            return { past: s.past.slice(0, -1), future: [snap(s), ...s.future], blocks: prev.blocks, steps: prev.steps };
        }),

    redo: () =>
        set((s) => {
            if (!s.future.length) return s;
            const [next, ...rest] = s.future;
            return { future: rest, past: [...s.past, snap(s)], blocks: next.blocks, steps: next.steps };
        }),

    // (x, y, z) = minimum corner of the item's footprint
    addBlock: (x, y, z) => {
        const { blocks, steps, palette, item, rotation, size, commit } = get();
        if (blocks.length >= MAX_BLOCKS) return;
        const def = ITEMS[palette[item]];
        if (!def) return;

        const occupied = buildOccupancy(blocks, palette);
        const fits = cellsOf(def, rotation, [x, y, z]).every(
            ([cx, cy, cz]) =>
                cx >= 0 && cy >= 0 && cz >= 0 && cx < size[0] && cy < size[1] && cz < size[2] &&
                !occupied.has(cellKey(cx, cy, cz)),
        );
        if (!fits) return;

        commit([...blocks, [x, y, z, item, rotation]], steps);
    },

    // removes the whole item, whichever of its cells was clicked
    removeBlock: (index) => {
        const { blocks, steps, commit } = get();
        if (index < 0 || index >= blocks.length) return;
        commit(
            blocks.filter((_, i) => i !== index),
            steps.map((st) => (st.end_index > index ? { ...st, end_index: st.end_index - 1 } : st)),
        );
    },

        // place many items as ONE undo step. strict = all or nothing; otherwise the ones that fit are placed.
    // entries: [[x, y, z, paletteIndex, rotation], ...]; returns how many were placed
    addMany: (entries, strict = false) => {
        const { blocks, steps, palette, size, commit } = get();
        const { placed, results } = resolveEntries(blocks, palette, size, entries, MAX_BLOCKS);
        if (!placed.length) return 0;
        if (strict && results.some((ok) => !ok)) return 0;
        commit([...blocks, ...placed], steps);
        return placed.length;
    },

    // remove many items as ONE undo step; steps' cut points follow
    removeMany: (indices) => {
        const { blocks, steps, commit } = get();
        const drop = new Set(indices);
        if (!drop.size) return 0;
        const removedBefore = [0];
        blocks.forEach((_, i) => removedBefore.push(removedBefore[i] + (drop.has(i) ? 1 : 0)));
        commit(
            blocks.filter((_, i) => !drop.has(i)),
            steps.map((st) => ({ ...st, end_index: st.end_index - removedBefore[Math.min(st.end_index, blocks.length)] })),
        );
        return drop.size;
    },

    // a step = "everything placed up to this point"
    addStep: (title) => {
        const { blocks, steps, commit } = get();
        const last = steps.length ? steps[steps.length - 1].end_index : 0;
        if (steps.length >= MAX_STEPS || blocks.length <= last) return;
        commit(blocks, [...steps, { title: title || `Step ${steps.length + 1}`, note: '', end_index: blocks.length }]);
    },

    updateStep: (i, patch) => set((s) => ({ steps: s.steps.map((st, k) => (k === i ? { ...st, ...patch } : st)) })),
    removeStep: (i) => set((s) => ({ steps: s.steps.filter((_, k) => k !== i) })),

    setTool: (tool) => set({ tool }),
    setItem: (item) => set({ item }),
    rotate: () => set((s) => ({ rotation: (s.rotation + 1) % 4 })),
    setLayer: (layer) => set({ layer }),
    setShowAbove: (showAbove) => set({ showAbove }),
}));