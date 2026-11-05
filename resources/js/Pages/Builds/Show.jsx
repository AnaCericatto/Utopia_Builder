import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import ViewerScene from '../../editor/ViewerScene';
import { normalizeBuild, makeSteps, layerSteps, stateOf, tally } from '../../editor/buildData';

const css = {
    btn: { padding: '6px 12px', border: '1px solid #bbb', borderRadius: 6, background: '#f8f8f8', cursor: 'pointer', fontSize: 14 },
    btnOn: { padding: '6px 12px', border: '1px solid #2563eb', borderRadius: 6, background: '#dbeafe', cursor: 'pointer', fontSize: 14 },
    h4: { margin: '16px 0 4px' },
};

function useNarrow(px = 820) {
    const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < px);
    useEffect(() => {
        const m = window.matchMedia(`(max-width: ${px}px)`);
        const update = () => setNarrow(m.matches);
        update();
        m.addEventListener('change', update);
        return () => m.removeEventListener('change', update);
    }, [px]);
    return narrow;
}

function Materials({ rows, empty }) {
    if (!rows.length) return <p style={{ color: '#64748b', margin: '4px 0' }}>{empty}</p>;
    return (
        <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0' }}>
            {rows.map((r) => (
                <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>
                        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: r.color, border: '1px solid #888', marginRight: 8, verticalAlign: 'middle' }} />
                        {r.name}
                    </span>
                    <strong>×{r.n}</strong>
                </li>
            ))}
        </ul>
    );
}

const VISIBILITY = {
    private: 'Private: only you can see this',
    unlisted: 'Unlisted: anyone with the link',
    public: 'Public',
};

export default function Show({ build, canEdit }) {
    const user = usePage().props.auth?.user;
    const narrow = useNarrow();

    const { palette, blocks, size, steps: savedSteps } = useMemo(() => normalizeBuild(build.data, build.steps), [build]);
    const authorSteps = useMemo(() => makeSteps(blocks, savedSteps), [blocks, savedSteps]);
    const byLayer = useMemo(() => layerSteps(blocks), [blocks]);
    const hasAuthorSteps = savedSteps.length > 0;

    const [mode, setMode] = useState(hasAuthorSteps ? 'steps' : 'layers');
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [highlight, setHighlight] = useState(true);
    const [viewKey, setViewKey] = useState(0);
    const [copied, setCopied] = useState(false);

    const steps = mode === 'steps' ? authorSteps : byLayer;
    const last = steps.length - 1;
    const idx = Math.min(index, Math.max(last, 0));
    const step = steps[idx];

    // arrow keys, Home, End
    useEffect(() => {
        const onKey = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, last));
            else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
            else if (e.key === 'Home') setIndex(0);
            else if (e.key === 'End') setIndex(last);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [last]);

    // autoplay
    useEffect(() => {
        if (!playing) return;
        const t = setInterval(() => setIndex((i) => Math.min(i + 1, last)), 1800);
        return () => clearInterval(t);
    }, [playing, last]);
    useEffect(() => {
        if (playing && idx >= last) setPlaying(false);
    }, [idx, last, playing]);

    const added = useMemo(() => (step ? tally(blocks, palette, (b, i) => stateOf(step, b, i) === 2) : []), [blocks, palette, step]);
    const total = useMemo(() => tally(blocks, palette, () => true), [blocks, palette]);
    const addedCount = added.reduce((sum, r) => sum + r.n, 0);

    const go = (i) => {
        setPlaying(false);
        setIndex(Math.max(0, Math.min(i, last)));
    };
    const togglePlay = () => {
        if (playing) return setPlaying(false);
        if (idx >= last) setIndex(0);
        setPlaying(true);
    };
    const changeMode = (m) => {
        setMode(m);
        setIndex(0);
        setPlaying(false);
    };
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            window.prompt('Copy this link:', window.location.href);
        }
    };

    const header = (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #ddd' }}>
            <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{build.title}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                    by {build.author.name}{build.author.username ? ` (@${build.author.username})` : ''} · {VISIBILITY[build.visibility]}
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {build.visibility !== 'private' && (
                    <button style={css.btn} onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
                )}
                {canEdit && <Link href={`/builds/${build.public_id}/edit`} style={{ ...css.btn, textDecoration: 'none', color: 'inherit' }}>Edit</Link>}
                {user ? (
                    <Link href="/builds" style={{ fontSize: 14 }}>My builds</Link>
                ) : (
                    <>
                        <Link href="/login" style={{ fontSize: 14 }}>Log in</Link>
                        <Link href="/register" style={{ fontSize: 14 }}>Register</Link>
                    </>
                )}
            </div>
        </div>
    );

    const head = (
        <Head title={build.title}>
            {build.visibility !== 'public' && <meta name="robots" content="noindex" />}
        </Head>
    );

    if (!blocks.length) {
        return (
            <div style={{ fontFamily: 'system-ui, sans-serif' }}>
                {head}
                {header}
                <p style={{ padding: 24 }}>This build is empty.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: narrow ? 'auto' : '100vh', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>
            {head}
            {header}

            <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', flex: 1, minHeight: 0 }}>
                <div style={{ position: 'relative', flex: narrow ? 'none' : 1, height: narrow ? '55vh' : 'auto', minWidth: 0 }}>
                    <div style={{ position: 'absolute', inset: 0 }}>
                        <ViewerScene blocks={blocks} palette={palette} size={size} step={step} highlight={highlight} viewKey={viewKey} />
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 12, color: '#475569' }}>
                        Drag: rotate · Right-drag: pan · Wheel: zoom · ← → : previous / next step
                    </div>
                </div>

                <aside style={{ width: narrow ? 'auto' : 340, overflowY: 'auto', padding: 16, background: '#fff', borderLeft: narrow ? 'none' : '1px solid #ddd', borderTop: narrow ? '1px solid #ddd' : 'none' }}>
                    <div style={{ color: '#64748b' }}>Step {idx + 1} of {steps.length}</div>
                    <h3 style={{ margin: '2px 0 8px' }}>{step.title}</h3>
                    {step.note && <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>{step.note}</p>}

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button style={css.btn} disabled={idx === 0} onClick={() => go(0)} title="First step">⏮</button>
                        <button style={css.btn} disabled={idx === 0} onClick={() => go(idx - 1)}>← Prev</button>
                        <button style={css.btnOn} disabled={idx === last} onClick={() => go(idx + 1)}>Next →</button>
                        <button style={css.btn} disabled={idx === last} onClick={() => go(last)} title="Finished build">⏭</button>
                        <button style={playing ? css.btnOn : css.btn} onClick={togglePlay}>{playing ? 'Pause' : 'Play'}</button>
                    </div>
                    <input
                        type="range" min={0} max={Math.max(last, 0)} value={idx} style={{ width: '100%', marginTop: 10 }}
                        onChange={(e) => go(Number(e.target.value))}
                    />

                    <h4 style={css.h4}>Add in this step ({addedCount})</h4>
                    <Materials rows={added} empty="Nothing new in this step." />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                        <label>
                            <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} /> highlight new items
                        </label>
                        {hasAuthorSteps && (
                            <label>
                                Steps:{' '}
                                <select value={mode} onChange={(e) => changeMode(e.target.value)}>
                                    <option value="steps">Author's steps</option>
                                    <option value="layers">By layer</option>
                                </select>
                            </label>
                        )}
                        <div><button style={css.btn} onClick={() => setViewKey((k) => k + 1)}>Reset view</button></div>
                    </div>

                    <h4 style={css.h4}>All steps</h4>
                    <ol style={{ margin: 0, paddingLeft: 22, maxHeight: 220, overflowY: 'auto' }}>
                        {steps.map((s, i) => (
                            <li key={i} style={{ margin: '2px 0' }}>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); go(i); }}
                                    style={{ fontWeight: i === idx ? 700 : 400, color: i === idx ? '#2563eb' : 'inherit' }}
                                >
                                    {s.title}
                                </a>
                            </li>
                        ))}
                    </ol>

                    <details style={{ marginTop: 16 }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Materials for the whole build ({blocks.length})</summary>
                        <Materials rows={total} empty="" />
                    </details>

                    {build.description && (
                        <>
                            <h4 style={css.h4}>About this build</h4>
                            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{build.description}</p>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}