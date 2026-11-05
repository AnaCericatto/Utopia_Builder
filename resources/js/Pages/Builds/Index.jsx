import { Head, Link, router } from '@inertiajs/react';
import SiteNav from '../../Components/SiteNav';

const LABEL = { private: 'Private', unlisted: 'Unlisted', public: 'Public' };
const COLOR = { private: '#64748b', unlisted: '#b45309', public: '#15803d' };
const action = { fontSize: 14, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'none' };

export default function Index({ builds }) {
    const remove = (b) => {
        if (window.confirm(`Delete "${b.title}"? This cannot be undone.`)) {
            router.delete(`/builds/${b.public_id}`);
        }
    };

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
            <Head title="My builds" />
            <SiteNav />

            <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h1 style={{ margin: 0 }}>My builds</h1>
                    <Link href="/builds/create" style={{ background: '#2563eb', color: '#fff', padding: '8px 14px', borderRadius: 8, textDecoration: 'none' }}>
                        + New build
                    </Link>
                </div>

                {builds.length === 0 ? (
                    <p>You have no builds yet. Start with <Link href="/builds/create">a new build</Link>.</p>
                ) : (
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                        {builds.map((b, i) => (
                            <div
                                key={b.public_id}
                                style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: i ? '1px solid #e2e8f0' : 'none' }}
                            >
                                <div>
                                    <Link href={`/builds/${b.public_id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>{b.title}</Link>
                                    <div style={{ fontSize: 13, color: '#64748b' }}>
                                        <span style={{ color: COLOR[b.visibility] }}>{LABEL[b.visibility]}</span> · {b.block_count} items · updated {new Date(b.updated_at).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 14 }}>
                                    <Link href={`/builds/${b.public_id}`} style={action}>View</Link>
                                    <Link href={`/builds/${b.public_id}/edit`} style={action}>Edit</Link>
                                    <button style={{ ...action, color: '#b91c1c' }} onClick={() => remove(b)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}