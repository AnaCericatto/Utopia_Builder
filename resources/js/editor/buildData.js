import { ITEMS } from './catalog';

// Turns saved data (v1 or v2) into { palette, blocks, steps, size }.
// Blocks whose item no longer exists in the catalog are dropped, and the steps' cut points follow.
export function normalizeBuild(data, steps) {
    let palette;
    let blocks;
    if (data?.version === 1) {
        palette = (data.palette ?? []).map((n) => `${n}_block`);
        blocks = (data.blocks ?? []).map(([x, y, z, p]) => [x, y, z, p, 0]);
    } else {
        palette = data?.palette ?? [];
        blocks = data?.blocks ?? [];
    }

    const kept = [];
    const prefix = [0];
    blocks.forEach((b) => {
        if (ITEMS[palette[b[3]]]) kept.push([b[0], b[1], b[2], b[3], b[4] ?? 0]);
        prefix.push(kept.length);
    });

    return {
        palette,
        blocks: kept,
        size: data?.size ?? [32, 16, 32],
        steps: (steps ?? []).map((s) => ({ ...s, end_index: prefix[Math.min(s.end_index, blocks.length)] })),
    };
}

// Author's steps. Each step shows blocks [0, to) and highlights blocks [from, to).
// Empty steps are skipped; anything placed after the last cut point becomes a final automatic step.
export function makeSteps(blocks, steps) {
    const out = [];
    let prev = 0;
    for (const s of steps) {
        const end = Math.min(Math.max(s.end_index, prev), blocks.length);
        if (end > prev) out.push({ title: s.title, note: s.note ?? '', from: prev, to: end });
        prev = end;
    }
    if (prev < blocks.length) {
        out.push({ title: out.length ? 'Finishing touches' : 'Complete build', note: '', from: prev, to: blocks.length });
    }
    return out;
}

// Automatic steps, one per layer that has something starting on it (an item belongs to the layer it starts on).
export function layerSteps(blocks) {
    const ys = [...new Set(blocks.map((b) => b[1]))].sort((a, b) => a - b);
    return ys.map((y) => ({ title: `Layer ${y}`, note: '', layerY: y }));
}

// 0 = not shown yet, 1 = already built, 2 = added in this step
export function stateOf(step, b, i) {
    if (step.layerY !== undefined) return b[1] > step.layerY ? 0 : b[1] === step.layerY ? 2 : 1;
    return i >= step.to ? 0 : i >= step.from ? 2 : 1;
}

// item counts for the blocks that pass `pick`, biggest first
export function tally(blocks, palette, pick) {
    const counts = new Map();
    blocks.forEach((b, i) => {
        if (!pick(b, i)) return;
        const id = palette[b[3]];
        counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return [...counts.entries()]
        .map(([id, n]) => ({ id, n, name: ITEMS[id].name, color: ITEMS[id].color }))
        .sort((a, b) => b.n - a.n);
}