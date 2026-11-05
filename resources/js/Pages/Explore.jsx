import { Head, Link, usePage } from '@inertiajs/react';
import SiteNav from '../Components/SiteNav';
import BuildCard from '../Components/BuildCard';

export default function Explore({ builds }) {
    const user = usePage().props.auth?.user;

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
            <Head title="Explore" />
            <SiteNav />

            <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
                <h1 style={{ margin: '0 0 4px' }}>Explore builds</h1>
                <p style={{ margin: '0 0 20px', color: '#64748b' }}>The newest public builds. Open one to step through how it was made.</p>

                {builds.length === 0 ? (
                    <p>
                        Nothing here yet.{' '}
                        <Link href={user ? '/builds/create' : '/register'}>Create the first build →</Link>
                    </p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                        {builds.map((b) => <BuildCard key={b.public_id} build={b} />)}
                    </div>
                )}
            </main>
        </div>
    );
}