import { Link, router, usePage } from '@inertiajs/react';

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Utopia Builder';

const link = { color: '#1e293b', textDecoration: 'none', fontSize: 14 };
const primary = { ...link, background: '#2563eb', color: '#fff', padding: '6px 12px', borderRadius: 6 };
const linkButton = { ...link, background: 'none', border: 'none', cursor: 'pointer', padding: 0 };

export default function SiteNav() {
    const user = usePage().props.auth?.user;

    return (
        <header style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
            <Link href="/" style={{ ...link, fontWeight: 700, fontSize: 18 }}>{APP_NAME}</Link>
            <nav style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <Link href="/explore" style={link}>Explore</Link>
                {user ? (
                    <>
                        <Link href="/builds" style={link}>My builds</Link>
                        <Link href="/builds/create" style={primary}>+ New build</Link>
                        <span style={{ color: '#64748b', fontSize: 13 }}>{user.name}</span>
                        <button style={linkButton} onClick={() => router.post('/logout')}>Log out</button>
                    </>
                ) : (
                    <>
                        <Link href="/login" style={link}>Log in</Link>
                        <Link href="/register" style={primary}>Sign up</Link>
                    </>
                )}
            </nav>
        </header>
    );
}