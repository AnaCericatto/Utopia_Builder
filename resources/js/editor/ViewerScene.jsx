import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ITEMS, footprintOf } from './catalog';
import { geometryOf } from './shapes';
import { stateOf } from './buildData';

const tmp = new THREE.Object3D();
const angleOf = (rot) => (-rot * Math.PI) / 2;

function Layer({ itemId, indices, blocks, glow }) {
    const item = ITEMS[itemId];
    const geometry = useMemo(() => geometryOf(itemId), [itemId]);
    const ref = useRef();
    const capacity = Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(indices.length, 1))));

    useLayoutEffect(() => {
        const mesh = ref.current;
        indices.forEach((bi, k) => {
            const b = blocks[bi];
            const rot = b[4] ?? 0;
            const [w, h, d] = footprintOf(item, rot);
            tmp.position.set(b[0] + w / 2, b[1] + h / 2, b[2] + d / 2);
            tmp.rotation.set(0, angleOf(rot), 0);
            tmp.updateMatrix();
            mesh.setMatrixAt(k, tmp.matrix);
        });
        mesh.count = indices.length;
        mesh.instanceMatrix.needsUpdate = true;
    }, [indices, blocks, item, capacity]);

    return (
        <instancedMesh key={capacity} ref={ref} args={[geometry, undefined, capacity]} frustumCulled={false}>
            <meshStandardMaterial
                color={item.color}
                emissive={glow ? item.color : '#000000'}
                emissiveIntensity={glow ? 0.5 : 0}
            />
        </instancedMesh>
    );
}

export default function ViewerScene({ blocks, palette, size, step, highlight, viewKey }) {
    // frame the whole finished build
    const view = useMemo(() => {
        if (!blocks.length) return { center: [size[0] / 2, 0, size[2] / 2], reach: 12 };
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        blocks.forEach((b) => {
            const [w, h, d] = footprintOf(ITEMS[palette[b[3]]], b[4] ?? 0);
            const hi = [b[0] + w, b[1] + h, b[2] + d];
            for (let k = 0; k < 3; k++) {
                min[k] = Math.min(min[k], b[k]);
                max[k] = Math.max(max[k], hi[k]);
            }
        });
        const extent = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
        return {
            center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
            reach: Math.max(extent[0], extent[1], extent[2], 6) * 1.3 + 4,
        };
    }, [blocks, palette, size]);

    // block indices grouped by item and state
    const groups = useMemo(() => {
        const map = new Map();
        blocks.forEach((b, i) => {
            const state = stateOf(step, b, i);
            if (!state) return;
            const key = `${palette[b[3]]}|${state}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(i);
        });
        return [...map.entries()];
    }, [blocks, palette, step]);

    const [cx, cy, cz] = view.center;

    return (
        <Canvas
            key={viewKey}
            camera={{ position: [cx + view.reach, cy + view.reach * 0.8, cz + view.reach], fov: 45 }}
            style={{ background: '#e8edf3' }}
        >
            <ambientLight intensity={0.7} />
            <directionalLight position={[30, 50, 20]} intensity={1.3} />

            {groups.map(([key, indices]) => {
                const [id, state] = key.split('|');
                return <Layer key={key} itemId={id} indices={indices} blocks={blocks} glow={highlight && state === '2'} />;
            })}

            <gridHelper args={[size[0], size[0], '#6b7280', '#c4c9d1']} position={[size[0] / 2, 0.01, size[2] / 2]} />
            <OrbitControls makeDefault enableDamping target={view.center} />
        </Canvas>
    );
}