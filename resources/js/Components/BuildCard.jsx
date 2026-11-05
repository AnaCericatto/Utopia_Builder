import { Link } from '@inertiajs/react';
import MiniPlan from './MiniPlan';

export default function BuildCard({ build }) {
    const by = build.author.username ? `@${build.author.username}` : build.author.name;

    return (
        <Link
            href={`/builds/${build.public_id}`}
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}
        >
            <MiniPlan preview={build.preview} />
            <div style={{ fontWeight: 600, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{build.title}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>by {by}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {build.block_count} items · {build.steps_count} {build.steps_count === 1 ? 'step' : 'steps'} · {build.updated}
            </div>
        </Link>
    );
}