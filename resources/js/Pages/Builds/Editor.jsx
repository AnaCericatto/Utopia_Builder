import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Scene from '../../editor/Scene';
import { useEditor, serializeBuild, MAX_BLOCKS, MAX_STEPS } from '../../editor/store';
import { ITEMS } from '../../editor/catalog';
import Plan from '../../editor/Plan';

const styles = {
    root: { display: 'grid', gridTemplateColumns: '210px 1fr 290px', height: '100vh', fontFamily: 'system-ui, sans-serif', fontSize: 14 },
    side: { padding: 12, overflowY: 'auto', background: '#fff', borderRight: '1px solid #ddd' },
    right: { padding: 12, overflowY: 'auto', background: '#fff', borderLeft: '1px solid #ddd' },
    center: { position: 'relative', minWidth: 0 },
    toolbar: { position: 'absolute', top: 10, left: 10, zIndex: 5, display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,.92)', padding: '6px 10px', borderRadius: 8, flexWrap: 'wrap' },
    btn: { padding: '4px 10px', border: '1px solid #bbb', borderRadius: 6, background: '#f8f8f8', cursor: 'pointer' },
    btnOn: { padding: '4px 10px', border: '1px solid #2563eb', borderRadius: 6, background: '#dbeafe', cursor: 'pointer' },
    row: (on) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', marginBottom: 4, borderRadius: 6, cursor: 'pointer', border: on ? '2px solid #2563eb' : '1px solid #ddd', background: on ? '#eff6ff' : '#fff' }),
    swatch: (color) => ({ width: 22, height: 22, borderRadius: 5, background: color, border: '1px solid #888', flex: 'none' }),
    input: { width: '100%', padding: 6, boxSizing: 'border-box', border: '1px solid #bbb', borderRadius: 6 },
    step: { border: '1px solid #ddd', borderRadius: 6, padding: 8, marginBottom: 8 },
    help: { position: 'absolute', bottom: 8, left: 10, zIndex: 5, fontSize: 12, color: '#475569' },
};

export default function Editor({ build }) {
    const { errors } = usePage().props;

    const [title, setTitle] = useState(build?.title ?? 'Untitled build');
    const [visibility, setVisibility] = useState(build?.visibility ?? 'private');
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState('3d'); // '3d' | 'split' | 'plan'

    const load = useEditor((s) => s.load);
    const palette = useEditor((s) => s.palette);
    const item = useEditor((s) => s.item);
    const setItem = useEditor((s) => s.setItem);
    const rotation = useEditor((s) => s.rotation);
    const rotate = useEditor((s) => s.rotate);
    const tool = useEditor((s) => s.tool);
    const setTool = useEditor((s) => s.setTool);
    const layer = useEditor((s) => s.layer);
    const setLayer = useEditor((s) => s.setLayer);
    const showAbove = useEditor((s) => s.showAbove);
    const setShowAbove = useEditor((s) => s.setShowAbove);
    const size = useEditor((s) => s.size);
    const blocks = useEditor((s) => s.blocks);
    const steps = useEditor((s) => s.steps);
    const canUndo = useEditor((s) => s.past.length > 0);
    const canRedo = useEditor((s) => s.future.length > 0);
    const undo = useEditor((s) => s.undo);
    const redo = useEditor((s) => s.redo);
    const addStep = useEditor((s) => s.addStep);
    const updateStep = useEditor((s) => s.updateStep);
    const removeStep = useEditor((s) => s.removeStep);

    // load the saved build into the editor (also runs after the first save redirects to /edit)
    useEffect(() => {
        load(build?.data ?? null, build?.steps ?? []);
        setTitle(build?.title ?? 'Untitled build');
        setVisibility(build?.visibility ?? 'private');
    }, [build?.public_id]);

    // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z, and R to rotate
    useEffect(() => {
        const onKey = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            const k = e.key.toLowerCase();
            if (e.ctrlKey || e.metaKey) {
                if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
                else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
            } else if (k === 'r') {
                rotate();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [undo, redo, rotate]);

    const save = () => {
        const s = useEditor.getState();
        const payload = {
            title,
            visibility,
            data: serializeBuild(s),
            steps: s.steps.map(({ title, note, end_index }) => ({ title, note, end_index })),
        };
        const options = {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
        };
        if (build) router.put(`/builds/${build.public_id}`, payload, options);
        else router.post('/builds', payload, options);
    };

    const lastEnd = steps.length ? steps[steps.length - 1].end_index : 0;
    const errorList = Object.values(errors ?? {});

    return (
        <div style={styles.root}>
            <Head title="Editor" />

            {/* left: items */}
            <div style={styles.side}>
                <Link href="/builds">← My builds</Link>
                <h4>Items</h4>
                {palette.map((id, i) => {
                    const def = ITEMS[id];
                    return (
                        <div key={id} style={styles.row(i === item)} onClick={() => setItem(i)}>
                            <div style={styles.swatch(def.color)} />
                            <div>
                                <div>{def.name}</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>{def.size.join('×')}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

                        {/* center: 3D view and / or plan view */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100vh' }}>
                <div style={{ display: 'flex', gap: 6, padding: '6px 10px', background: '#fff', borderBottom: '1px solid #ddd' }}>
                    {[['3d', '3D'], ['split', 'Split'], ['plan', 'Plan']].map(([k, label]) => (
                        <button key={k} style={view === k ? styles.btnOn : styles.btn} onClick={() => setView(k)}>{label}</button>
                    ))}
                </div>

                <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                    {view !== 'plan' && (
                        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                            <div style={{ position: 'absolute', inset: 0 }}>
                                <Scene />
                            </div>
                            <div style={styles.toolbar}>
                                <button style={tool === 'place' ? styles.btnOn : styles.btn} onClick={() => setTool('place')}>Place</button>
                                <button style={tool === 'remove' ? styles.btnOn : styles.btn} onClick={() => setTool('remove')}>Remove</button>
                                <button style={styles.btn} onClick={rotate}>Rotate (R) {rotation * 90}°</button>
                                <button style={styles.btn} disabled={!canUndo} onClick={undo}>Undo</button>
                                <button style={styles.btn} disabled={!canRedo} onClick={redo}>Redo</button>
                                <span>Layer {layer}</span>
                                <input type="range" min={0} max={size[1] - 1} value={layer} onChange={(e) => setLayer(Number(e.target.value))} />
                                <label>
                                    <input type="checkbox" checked={showAbove} onChange={(e) => setShowAbove(e.target.checked)} /> show layers above
                                </label>
                            </div>
                            <div style={styles.help}>
                                Left-drag: rotate view · Right-drag: pan · Wheel: zoom · R: rotate item · Shift+click: opposite tool · Click empty grid to place at the current layer
                            </div>
                        </div>
                    )}

                    {view !== '3d' && (
                        <div style={{ position: 'relative', flex: 1, minWidth: 0, borderLeft: view === 'split' ? '2px solid #94a3b8' : 'none' }}>
                            <Plan />
                        </div>
                    )}
                </div>
            </div>

            {/* right: details + steps */}
            <div style={styles.right}>
                <h4 style={{ marginTop: 0 }}>Build</h4>
                <input style={styles.input} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
                <select style={{ ...styles.input, marginTop: 8 }} value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted (link only)</option>
                    <option value="public">Public</option>
                </select>
                <p style={{ color: '#475569' }}>{blocks.length} / {MAX_BLOCKS} items</p>
                <button style={{ ...styles.btnOn, width: '100%', padding: 8 }} onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                </button>
                {errorList.length > 0 && (
                    <ul style={{ color: '#b91c1c', paddingLeft: 18 }}>
                        {errorList.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                )}

                <h4>Steps ({steps.length}/{MAX_STEPS})</h4>
                <button style={styles.btn} disabled={blocks.length <= lastEnd} onClick={() => addStep()}>
                    + End step here ({blocks.length - lastEnd} new)
                </button>
                <div style={{ marginTop: 10 }}>
                    {steps.map((st, i) => (
                        <div key={i} style={styles.step}>
                            <input style={styles.input} value={st.title} maxLength={100} onChange={(e) => updateStep(i, { title: e.target.value })} />
                            <textarea
                                style={{ ...styles.input, marginTop: 6 }}
                                rows={2}
                                placeholder="Note (optional)"
                                value={st.note ?? ''}
                                onChange={(e) => updateStep(i, { note: e.target.value })}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: '#475569' }}>
                                <span>{st.end_index - (i ? steps[i - 1].end_index : 0)} items</span>
                                <button style={styles.btn} onClick={() => removeStep(i)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}