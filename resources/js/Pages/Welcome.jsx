import { Head, Link, usePage } from '@inertiajs/react';
import SiteNav, { APP_NAME } from '../Components/SiteNav';
import BuildCard from '../Components/BuildCard';

const features = [
    ['Plan from above', 'Sketch walls, floors and rooms on a 2D plan with pencil, line and rectangle tools, or stamp ready-made prefabs.'],
    ['Build in 3D', 'Switch to the 3D view any time. Both views edit the same build, with undo and redo for every move.'],
    ['Share it step by step', 'Publish a link. Visitors step through your build, see what to place in each step and which materials they need.'],
];

export default function Welcome({ featured }) {
    const user = usePage().props.auth?.user;
    const button = { display: 'inline-block', padding: '10px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 };

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
            <Head title="Plan, build and share" />
            <SiteNav />

            <section style={{ maxWidth: 860, margin: '0 auto', padding: '56px 20px 32px', textAlign: 'center' }}>
                <h1 style={{ fontSize: 40, margin: '0 0 12px', lineHeight: 1.15 }}>Design it in 3D. Share it step by step.</h1>
                <p style={{ fontSize: 18, color: '#475569', margin: '0 auto 24px', maxWidth: 640 }}>
                    {APP_NAME} is a browser-based voxel build planner. Sketch from above, build in 3D, then publish a link that walks anyone
                    through your build one step at a time.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href="/explore" style={{ ...button, background: '#2563eb', color: '#fff' }}>Explore builds</Link>
                    <Link
                        href={user ? '/builds/create' : '/register'}
                        style={{ ...button, background: '#fff', color: '#1e293b', border: '1px solid #cbd5e1' }}
                    >
                        {user ? 'Start building' : 'Sign up to build'}
                    </Link>
                </div>
            </section>

            <section style={{ maxWidth: 1000, margin: '0 auto', padding: '16px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {features.map(([title, text]) => (
                    <div key={title} style={{ flex: '1 1 240px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
                        <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.5 }}>{text}</div>
                    </div>
                ))}
            </section>

            {featured.length > 0 && (
                <section style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <h2 style={{ margin: '0 0 12px' }}>Latest builds</h2>
                        <Link href="/explore">See all →</Link>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                        {featured.map((b) => <BuildCard key={b.public_id} build={b} />)}
                    </div>
                </section>
            )}

            <footer style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: '32px 20px' }}>
                An independent hobby project, not affiliated with any game publisher.
            </footer>
        </div>
    );
}