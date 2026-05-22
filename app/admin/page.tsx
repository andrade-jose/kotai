'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
    visits_today: number;
    visits_total: number;
    visits_by_page: { page: string; count: number }[];
    price_usd: number | null;
    price_brl: number | null;
    price_last_update: string | null;
    news_last_update: string | null;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [newPrice, setNewPrice] = useState('');
    const [priceMsg, setPriceMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/admin/stats').then(r => r.json()).then(setStats);
        }
    }, [status]);

    async function updatePrice() {
        if (!newPrice) return;
        setSaving(true);
        setPriceMsg(null);
        try {
            const r = await fetch('/api/admin/price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price_brl: newPrice }),
            });
            const d = await r.json();
            if (d.ok) {
                setPriceMsg({ ok: true, text: `✓ preço atualizado para R$ ${parseFloat(newPrice).toFixed(4)}` });
                setStats(s => s ? { ...s, price_usd: parseFloat(newPrice), price_last_update: new Date().toISOString() } : s);
                setNewPrice('');
            } else {
                setPriceMsg({ ok: false, text: `✗ ${d.error}` });
            }
        } catch (e: any) {
            setPriceMsg({ ok: false, text: `✗ erro de rede: ${e.message}` });
        } finally {
            setSaving(false);
        }
    }

    function sanitize(v: string) {
        return v.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    }

    const fmt = (d: string | null) => d ? new Date(d).toLocaleString('pt-BR') : '—';

    const c = {
        bg: '#0a0a0f', surface: '#111118', border: '#1c1c28',
        text: '#e2e8f0', muted: '#4a5568', dim: '#2d3748',
        green: '#4ade80', greenDim: '#166534', red: '#f87171', redDim: '#7f1d1d',
    };

    if (status === 'loading' || !session) {
        return (
            <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, color: c.muted }}>
                carregando...
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'var(--font-sans)' }}>

            <nav style={{ borderBottom: `1px solid ${c.border}`, background: c.bg, position: 'sticky', top: 0, zIndex: 50 }}>
                <div className="admin-nav">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src="/kotai-logo.svg" alt="Kotai" style={{ height: 24, width: 'auto' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: c.muted }}>kti_tracker</span>
                        <span style={{ color: c.dim }}>/</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: c.text }}>admin</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {session.user?.image && <img src={session.user.image} style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${c.border}` }} alt="" />}
                            <span className="admin-uname" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: c.muted }}>{session.user?.name}</span>
                        </div>
                        <button onClick={() => signOut({ callbackUrl: '/' })}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: c.muted, background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                            sair →
                        </button>
                    </div>
                </div>
            </nav>

            <div className="admin-wrap">
                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Painel de controle</h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: c.muted }}>
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>

                <div className="admin-metrics">
                    {[
                        { label: 'Visitas hoje', value: stats?.visits_today ?? '—', hint: 'páginas acessadas' },
                        { label: 'Total visitas', value: stats?.visits_total ?? '—', hint: 'desde o início' },
                        { label: 'Preço KTI', value: stats?.price_brl ? 'R$ ' + stats.price_brl.toFixed(4) : '—', hint: fmt(stats?.price_last_update ?? null) },
                        { label: 'Análise IA', value: stats?.news_last_update ? '✓' : '—', hint: fmt(stats?.news_last_update ?? null) },
                    ].map(m => (
                        <div key={m.label} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: '16px 18px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>{m.label}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: c.text, marginBottom: 4 }}>{m.value}</div>
                            <div style={{ fontSize: 11, color: c.dim }}>{m.hint}</div>
                        </div>
                    ))}
                </div>

                {/* PRICE */}
                <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ padding: '12px 20px', borderBottom: `1px solid ${c.border}` }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Atualizar preço do KTI (R$)</span>
                    </div>
                    <div style={{ padding: 20 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: c.muted, marginBottom: 12 }}>
                            Preço atual: <span style={{ color: c.green }}>{stats?.price_brl ? 'R$ ' + stats.price_brl.toFixed(4) : 'não definido'}</span>
                        </div>
                        <div className="price-row">
                            <input value={newPrice} onChange={e => setNewPrice(sanitize(e.target.value))}
                                type="text" inputMode="decimal" placeholder="ex: 0.30"
                                style={{ flex: 1, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 14, color: c.text, outline: 'none' }} />
                            <button onClick={updatePrice} disabled={saving || !newPrice}
                                style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: c.green, color: c.bg, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: saving || !newPrice ? 'not-allowed' : 'pointer', opacity: saving || !newPrice ? 0.5 : 1, fontWeight: 700, whiteSpace: 'nowrap' as const }}>
                                {saving ? 'salvando...' : 'salvar'}
                            </button>
                        </div>
                        {priceMsg && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 10, padding: '8px 12px', borderRadius: 6, background: priceMsg.ok ? '#0d1f0f' : '#1f0d0d', border: `1px solid ${priceMsg.ok ? c.greenDim : c.redDim}`, color: priceMsg.ok ? c.green : c.red }}>
                                {priceMsg.text}
                            </div>
                        )}
                    </div>
                </div>

                {/* PAGES */}
                <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ padding: '12px 20px', borderBottom: `1px solid ${c.border}` }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Páginas mais acessadas</span>
                    </div>
                    <div style={{ padding: 20 }}>
                        {stats?.visits_by_page?.length ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                                        <th style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', paddingBottom: 8, textAlign: 'left' as const, fontWeight: 400 }}>Página</th>
                                        <th style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', paddingBottom: 8, textAlign: 'right' as const, fontWeight: 400 }}>Visitas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.visits_by_page.map(p => (
                                        <tr key={p.page} style={{ borderBottom: `1px solid ${c.border}` }}>
                                            <td style={{ padding: '9px 0', fontSize: 12, color: c.muted, fontFamily: 'var(--font-mono)' }}>{p.page}</td>
                                            <td style={{ padding: '9px 0', fontSize: 12, color: c.text, fontFamily: 'var(--font-mono)', textAlign: 'right' as const }}>{p.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: c.dim }}>Nenhuma visita ainda.</p>
                        )}
                    </div>
                </div>

                {/* STATUS */}
                <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 40 }}>
                    <div style={{ padding: '12px 20px', borderBottom: `1px solid ${c.border}` }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Status do sistema</span>
                    </div>
                    <div style={{ padding: 20 }}>
                        {[
                            { k: 'Domínio', v: 'kotaitracker.online', ok: true },
                            { k: 'Ambiente', v: 'production', ok: true },
                            { k: 'Banco de dados', v: 'SQLite ✓', ok: true },
                            { k: 'Groq API', v: stats?.news_last_update ? 'conectado ✓' : 'sem dados ainda', ok: !!stats?.news_last_update },
                            { k: 'Preço manual', v: stats?.price_usd ? 'definido ✓' : 'não definido', ok: !!stats?.price_usd },
                        ].map((s, i, arr) => (
                            <div key={s.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${c.border}` : 'none' }}>
                                <span style={{ fontSize: 12, color: c.muted }}>{s.k}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 10px', borderRadius: 4, background: s.ok ? '#0d1f0f' : '#1a1a0d', border: `1px solid ${s.ok ? c.greenDim : c.dim}`, color: s.ok ? c.green : c.muted }}>
                                    {s.v}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
        .admin-nav { max-width: 1000px; margin: 0 auto; padding: 0 32px; height: 52px; display: flex; align-items: center; justify-content: space-between; }
        .admin-wrap { max-width: 1000px; margin: 0 auto; padding: 36px 32px; }
        .admin-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
        .price-row { display: flex; gap: 10px; }
        .admin-uname { display: inline; }
        @media (max-width: 768px) {
          .admin-nav { padding: 0 16px; }
          .admin-wrap { padding: 20px 16px; }
          .admin-metrics { grid-template-columns: repeat(2, 1fr); }
          .admin-uname { display: none; }
        }
        @media (max-width: 480px) {
          .admin-metrics { grid-template-columns: 1fr 1fr; }
          .price-row { flex-direction: column; }
        }
      `}</style>
        </div>
    );
}