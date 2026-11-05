import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEditor } from './store';
import { ITEMS, footprintOf, buildOccupancy, cellsOf, cellKey } from './catalog';
import { geometryOf } from './shapes';

const tmp = new THREE.Object3D();
const mat = new THREE.Matrix4();
const noRaycast = () => null;
const angleOf = (rot) => (-rot * Math.PI) / 2;

// center of an item's (rotated) footprint, used for both instances and the preview
function centerOf(item, rot, [x, y, z]) {
    const [w, h, d] = footprintOf(item, rot);
    return [x + w / 2, y + h / 2, z + d / 2];
}

function ItemLayer({ itemId, indices, blocks, handlers }) {
    const item = ITEMS[itemId];
    const geometry = useMemo(() => geometryOf(itemId), [itemId]);
    const meshRef = useRef();
    // capacity grows in powers of two; a new capacity remounts the mesh (via key)
    const capacity = Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(indices.length, 1))));

    useLayoutEffect(() => {
        const mesh = meshRef.current;
        indices.forEach((bi, k) => {
            const b = blocks[bi];
            const rot = b[4] ?? 0;
            tmp.position.set(...centerOf(item, rot, b));
            tmp.rotation.set(0, angleOf(rot), 0);
            tmp.updateMatrix();
            mesh.setMatrixAt(k, tmp.matrix);
        });
        mesh.count = indices.length;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere(); // needed so clicks keep hitting the instances
    }, [indices, blocks, item, capacity]);

    return (
        <instancedMesh key={capacity} ref={meshRef} args={[geometry, undefined, capacity]} frustumCulled={false} {...handlers}>
            <meshStandardMaterial color={item.color} />
        </instancedMesh>
    );
}

function World() {
    const blocks = useEditor((s) => s.blocks);
    const palette = useEditor((s) => s.palette);
    const size = useEditor((s) => s.size);
    const layer = useEditor((s) => s.layer);
    const showAbove = useEditor((s) => s.showAbove);
    const tool = useEditor((s) => s.tool);
    const itemIdx = useEditor((s) => s.item);
    const rotation = useEditor((s) => s.rotation);
    const addBlock = useEditor((s) => s.addBlock);
    const removeBlock = useEditor((s) => s.removeBlock);

    // hover = { mode: 'place', cell } | { mode: 'remove', bi } | null
    const [hover, setHover] = useState(null);

    const selected = ITEMS[palette[itemIdx]];
    const occupied = useMemo(() => buildOccupancy(blocks, palette), [blocks, palette]);

    // block indices grouped by item id (only the ones that are visible)
    const groups = useMemo(() => {
        const g = new Map();
        blocks.forEach((b, i) => {
            if (!showAbove && b[1] > layer) return;
            const id = palette[b[3]];
            if (!g.has(id)) g.set(id, []);
            g.get(id).push(i);
        });
        return [...g.entries()];
    }, [blocks, palette, layer, showAbove]);

    // a click or hover on a placed block clears hover when the blocks change
    useLayoutEffect(() => setHover(null), [blocks]);

    // can the selected item (with the current rotation) be placed at this origin cell?
    const placeable = (cell) =>
        !!selected &&
        (showAbove || cell[1] <= layer) &&
        cellsOf(selected, rotation, cell).every(
            ([x, y, z]) =>
                x >= 0 && y >= 0 && z >= 0 && x < size[0] && y < size[1] && z < size[2] && !occupied.has(cellKey(x, y, z)),
        );

    // Shift temporarily switches to the opposite tool
    const modeOf = (e) => ((tool === 'place') !== !!e.nativeEvent?.shiftKey ? 'place' : 'remove');

    const targetFromBlock = (e, indices) => {
        const bi = indices[e.instanceId];
        if (bi === undefined) return null;
        if (modeOf(e) === 'remove') return { mode: 'remove', bi };

        // face normal arrives in the instance's local space; rotate it into world space
        e.object.getMatrixAt(e.instanceId, mat);
        const n = e.face.normal.clone().transformDirection(mat);
        const nx = Math.round(n.x), ny = Math.round(n.y), nz = Math.round(n.z);
        const p = e.point;
        // the cell just inside the hit face, then one step along the normal
        const cell = [
            Math.floor(p.x - nx * 0.01) + nx,
            Math.floor(p.y - ny * 0.01) + ny,
            Math.floor(p.z - nz * 0.01) + nz,
        ];
        return { mode: 'place', cell };
    };

    const targetFromPlane = (e) =>
        modeOf(e) === 'remove' ? null : { mode: 'place', cell: [Math.floor(e.point.x), layer, Math.floor(e.point.z)] };

    const sameTarget = (a, b) =>
        a && b && a.mode === b.mode && a.bi === b.bi && a.cell?.[0] === b.cell?.[0] && a.cell?.[1] === b.cell?.[1] && a.cell?.[2] === b.cell?.[2];

    const act = (e, t) => {
        e.stopPropagation();
        if (e.delta > 4) return; // it was a camera drag, not a click
        if (!t) return;
        if (t.mode === 'remove') removeBlock(t.bi);
        else if (placeable(t.cell)) addBlock(...t.cell);
    };

    const handlersFor = (getTarget) => ({
        onPointerMove: (e) => {
            e.stopPropagation();
            const t = getTarget(e);
            setHover((prev) => (sameTarget(prev, t) ? prev : t));
        },
        onPointerOut: () => setHover(null),
        onClick: (e) => act(e, getTarget(e)),
    });

    const ghostValid = hover?.mode === 'place' && placeable(hover.cell);
    const removing = hover?.mode === 'remove' ? blocks[hover.bi] : null;
    const removingItem = removing ? ITEMS[palette[removing[3]]] : null;

    return (
        <>
            <ambientLight intensity={0.7} />
            <directionalLight position={[30, 50, 20]} intensity={1.3} />

            {groups.map(([id, indices]) => (
                <ItemLayer
                    key={id}
                    itemId={id}
                    indices={indices}
                    blocks={blocks}
                    handlers={handlersFor((e) => targetFromBlock(e, indices))}
                />
            ))}

            {/* work plane: clicking empty space places an item at this height */}
            <mesh position={[size[0] / 2, layer, size[2] / 2]} rotation={[-Math.PI / 2, 0, 0]} {...handlersFor(targetFromPlane)}>
                <planeGeometry args={[size[0], size[2]]} />
                <meshBasicMaterial color="#4f8cff" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <gridHelper args={[size[0], size[0], '#6b7280', '#c4c9d1']} position={[size[0] / 2, layer + 0.01, size[2] / 2]} />

            {/* preview of the item being placed: tinted red when it doesn't fit */}
            {hover?.mode === 'place' && selected && (
                <mesh
                    geometry={geometryOf(palette[itemIdx])}
                    position={centerOf(selected, rotation, hover.cell)}
                    rotation={[0, angleOf(rotation), 0]}
                    raycast={noRaycast}
                >
                    <meshStandardMaterial color={ghostValid ? selected.color : '#ff3b30'} transparent opacity={0.55} depthWrite={false} />
                </mesh>
            )}

            {/* outline of the whole item that would be removed */}
            {removing && removingItem && (
                <mesh position={centerOf(removingItem, removing[4] ?? 0, removing)} raycast={noRaycast}>
                    <boxGeometry args={footprintOf(removingItem, removing[4] ?? 0).map((v) => v + 0.06)} />
                    <meshBasicMaterial color="#ff3b30" wireframe />
                </mesh>
            )}

            <OrbitControls makeDefault enableDamping target={[size[0] / 2, 0, size[2] / 2]} />
        </>
    );
}

export default function Scene() {
    return (
        <Canvas camera={{ position: [46, 34, 46], fov: 45 }} style={{ background: '#e8edf3' }}>
            <World />
        </Canvas>
    );
}