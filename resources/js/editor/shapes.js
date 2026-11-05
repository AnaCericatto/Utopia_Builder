import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ITEMS } from './catalog';

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

const builders = {
    box: (item) => box(...item.size),

    // three steps rising toward the back (-z)
    stairs: () =>
        mergeGeometries(
            [0, 1, 2].map((i) => {
                const h = (i + 1) / 3;
                return box(1, h, 1 / 3, 0, -0.5 + h / 2, 0.5 - (i + 0.5) / 3);
            }),
        ),

    // 1 x 2 x 1: base, pole and lamp head
    lamp: () =>
        mergeGeometries([
            new THREE.CylinderGeometry(0.35, 0.4, 0.2, 16).translate(0, -0.9, 0),
            new THREE.CylinderGeometry(0.07, 0.07, 1.2, 12).translate(0, -0.2, 0),
            new THREE.SphereGeometry(0.3, 16, 12).translate(0, 0.65, 0),
        ]),

    // 2 x 1 x 1: seat, two legs and a back
    bench: () =>
        mergeGeometries([
            box(2, 0.15, 0.8, 0, -0.025, 0),
            box(0.15, 0.4, 0.6, -0.8, -0.3, 0),
            box(0.15, 0.4, 0.6, 0.8, -0.3, 0),
            box(2, 0.35, 0.1, 0, 0.225, -0.35),
        ]),
};

const cache = new Map();

export function geometryOf(id) {
    if (!cache.has(id)) {
        const item = ITEMS[id];
        // later: shape "model" will load a .glb here. Until then, draw a box of the footprint size.
        const make = builders[item.shape] ?? builders.box;
        cache.set(id, make(item));
    }
    return cache.get(id);
}