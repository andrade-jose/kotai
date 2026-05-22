'use client';
import { useEffect, useState, useCallback } from 'react';

interface PriceData {
  price_usd: number;
  price_brl: number;
  price_sale_usd: number;
  price_sale_brl: number;
  usd_brl_rate: number;
  change_24h: number;
  volume_24h: number;
  market_cap: number;
  updated_at: string;
}
interface NewsData {
  summary: string;
  generated_at: string;
  stale?: boolean;
}

export default function Home() {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [news, setNews] = useState<NewsData | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [ktiInput, setKtiInput] = useState('');
  const [brlInput, setBrlInput] = useState('');
  const [ktiMode, setKtiMode] = useState(true);
  const [portfolio, setPortfolio] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadPrice = useCallback(async () => {
    const r = await fetch('/api/price').catch(() => null);
    if (!r?.ok) return;
    const d = await r.json();
    if (!d.error) setPrice(d);
  }, []);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    const r = await fetch('/api/news').catch(() => null);
    if (r?.ok) { const d = await r.json(); if (!d.error) setNews(d); }
    setNewsLoading(false);
  }, []);

  useEffect(() => {
    loadPrice(); loadNews();
    const t = setInterval(loadPrice, 2 * 60 * 1000);
    return () => clearInterval(t);
  }, [loadPrice, loadNews]);

  const pBRL = price?.price_brl ?? 0;
  const pUSD = price?.price_usd ?? 0;
  const pSaleBRL = price?.price_sale_brl ?? 0;
  const pSaleUSD = price?.price_sale_usd ?? 0;

  function sanitize(v: string) {
    return v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  }

  function handleKti(v: string) {
    const clean = sanitize(v);
    setKtiInput(clean);
    setBrlInput(pBRL && clean ? (parseFloat(clean) * pBRL).toFixed(4) : '');
  }
  function handleBrl(v: string) {
    const clean = sanitize(v);
    setBrlInput(clean);
    setKtiInput(pBRL && clean ? (parseFloat(clean) / pBRL).toFixed(8) : '');
  }
  function swap() {
    setKtiMode(m => !m);
    setKtiInput('');
    setBrlInput('');
  }

  const portBRL = portfolio && pBRL
    ? (parseFloat(portfolio) * pBRL).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';
  const portUSD = portfolio && pUSD ? (parseFloat(portfolio) * pUSD).toFixed(4) : '0.0000';

  const c = {
    bg: '#0a0a0f',
    surface: '#111118',
    border: '#1c1c28',
    text: '#e2e8f0',
    muted: '#4a5568',
    dim: '#2d3748',
    green: '#4ade80',
    greenDim: '#166534',
    yellow: '#fbbf24',
  };

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'var(--font-sans)' }}>

      {/* NAV */}
      <nav style={{ borderBottom: `1px solid ${c.border}`, background: c.bg, position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/kotai-logo.svg" alt="Kotai" style={{ height: 26, width: 'auto' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: c.text }}>KTI Tracker</span>
          </div>
          <div className="nav-links">
            {[['#conversor', 'conversor'], ['#portfolio', 'portfólio'], ['#noticias', 'análise ia'], ['#sobre', 'sobre']].map(([h, l]) => (
              <a key={h} href={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: c.muted, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{l}</a>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: c.green }}>
            {pBRL ? 'R$ ' + pBRL.toFixed(6) : '—'}
          </div>
        </div>
      </nav>

      <div className="page-wrap">
        <div className="page-grid">

          {/* MAIN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* HERO */}
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: c.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                Kotai · KTI · BSC
              </p>
              <h1 className="hero-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10, color: c.text }}>
                Acompanhe o <span style={{ color: c.green }}>KTI</span>
              </h1>
              <p style={{ fontSize: 14, color: c.muted, lineHeight: 1.7, maxWidth: 440 }}>
                Conversor BRL em tempo real, calculadora de portfólio e análise diária com IA.
              </p>
            </div>

            {/* STATS ROW */}
            <div className="stats-grid" style={{ gap: 1, background: c.border, borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
              {[
                { label: 'Preço BRL', value: pBRL ? 'R$ ' + pBRL.toFixed(6) : '—', color: c.text },
                { label: 'Preço USD', value: pUSD ? '$' + pUSD.toFixed(8) : '—', color: c.text },
                { label: 'Dólar hoje', value: price ? 'R$ ' + price.usd_brl_rate.toFixed(2) : '—', color: c.text },
                { label: 'Preço Venda BRL', value: pSaleBRL ? 'R$ ' + pSaleBRL.toFixed(6) : '—', color: c.yellow },
              ].map(s => (
                <div key={s.label} style={{ background: c.surface, padding: '16px 20px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* CONVERSOR */}
            <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }} id="conversor">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Conversor</div>

              <div style={{ background: c.bg, border: `1px solid ${ktiMode ? c.green : c.border}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, transition: 'border-color 0.2s' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: c.green, background: `${c.green}15`, border: `1px solid ${c.green}30`, borderRadius: 4, padding: '2px 8px', minWidth: 36, textAlign: 'center' as const }}>KTI</span>
                {ktiMode ? (
                  <input value={ktiInput} onChange={e => handleKti(e.target.value)}
                    placeholder="0" type="text" inputMode="decimal"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, textAlign: 'right' as const, color: c.text }} />
                ) : (
                  <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, textAlign: 'right' as const, color: c.muted, userSelect: 'none' as const }}>
                    {ktiInput || '0'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                <button onClick={swap} style={{ width: 32, height: 32, borderRadius: '50%', background: c.bg, border: `1px solid ${c.border}`, color: c.muted, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⇅</button>
              </div>

              <div style={{ background: c.bg, border: `1px solid ${!ktiMode ? c.yellow : c.border}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, transition: 'border-color 0.2s' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: c.yellow, background: `${c.yellow}15`, border: `1px solid ${c.yellow}30`, borderRadius: 4, padding: '2px 8px', minWidth: 36, textAlign: 'center' as const }}>BRL</span>
                {!ktiMode ? (
                  <input value={brlInput} onChange={e => handleBrl(e.target.value)}
                    placeholder="0" type="text" inputMode="decimal"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, textAlign: 'right' as const, color: c.text }} />
                ) : (
                  <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, textAlign: 'right' as const, color: c.muted, userSelect: 'none' as const }}>
                    {brlInput || '0'}
                  </span>
                )}
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.dim, textAlign: 'center', marginTop: 10 }}>
                {pBRL ? `1 KTI = R$ ${pBRL.toFixed(4)} · $${pUSD.toFixed(8)}` : 'preço não definido'}
              </div>
            </div>

            {/* PORTFOLIO */}
            <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }} id="portfolio">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Calculadora de portfólio</div>
              <input value={portfolio} onChange={e => setPortfolio(sanitize(e.target.value))}
                placeholder="Quantos KTI você tem?" type="text" inputMode="decimal"
                style={{ width: '100%', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 15, color: c.text, outline: 'none', marginBottom: 12, boxSizing: 'border-box' as const }} />
              <div style={{ background: '#0d1f0f', border: `1px solid ${c.greenDim}`, borderRadius: 8, padding: '16px 18px', marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: `${c.green}80`, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Valor de mercado</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: c.green }}>R$ {portBRL}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: c.muted, marginTop: 4 }}>≈ ${portUSD} USD</div>
              </div>
              <div style={{ background: '#1a1500', border: `1px solid ${c.yellow}30`, borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: `${c.yellow}80`, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Valor de venda (+50%)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: c.yellow }}>
                  {portfolio && pSaleBRL ? 'R$ ' + (parseFloat(portfolio) * pSaleBRL).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'R$ 0,00'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: c.muted, marginTop: 4 }}>
                  ≈ ${portfolio && pSaleUSD ? (parseFloat(portfolio) * pSaleUSD).toFixed(4) : '0.0000'} USD
                </div>
              </div>
            </div>

            {/* NEWS */}
            <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }} id="noticias">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: c.text, letterSpacing: '-0.01em' }}>Análise diária <span style={{ color: c.green }}>— IA</span></div>
                {mounted && (
                  <button onClick={loadNews} disabled={newsLoading}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 6, padding: '5px 12px', cursor: newsLoading ? 'not-allowed' : 'pointer', opacity: newsLoading ? 0.4 : 1 }}>
                    ↻ atualizar
                  </button>
                )}
              </div>
              <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '14px 18px', minHeight: 80 }}>
                {newsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: c.dim }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${c.green}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    gerando análise com IA...
                  </div>
                ) : news?.summary ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {news.summary.split('\n').filter(p => p.trim()).map((p, i) => (
                      <p key={i} style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8, margin: 0 }}>{p}</p>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: c.dim, margin: 0 }}>Análise indisponível.</p>
                )}
              </div>
              {mounted && news && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.dim, marginTop: 8 }}>
                  {new Date(news.generated_at).toLocaleString('pt-BR')}{news.stale ? ' · cache' : ''}
                </div>
              )}
            </div>

          </div>

          {/* SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Token</div>
              {[
                { k: 'Preço BRL', v: pBRL ? 'R$ ' + pBRL.toFixed(6) : '—', color: c.text },
                { k: 'Preço USD', v: pUSD ? '$' + pUSD.toFixed(8) : '—', color: c.text },
                { k: 'Venda BRL', v: pSaleBRL ? 'R$ ' + pSaleBRL.toFixed(6) : '—', color: c.yellow },
                { k: 'Venda USD', v: pSaleUSD ? '$' + pSaleUSD.toFixed(8) : '—', color: c.yellow },
                { k: 'Dólar', v: price ? 'R$ ' + price.usd_brl_rate.toFixed(2) : '—', color: c.text },
                { k: 'Rede', v: 'BSC (BEP-20)', color: c.text },
                { k: 'Símbolo', v: 'KTI', color: c.text },
              ].map((s, i, arr) => (
                <div key={s.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${c.border}` : 'none' }}>
                  <span style={{ fontSize: 12, color: c.muted }}>{s.k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: s.color }}>{s.v}</span>
                </div>
              ))}
            </div>

            <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }} id="sobre">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Sobre o Kotai</div>
              {[
                { t: 'O que é?', d: 'Token nativo do ecossistema Kotai na Binance Smart Chain. Proof-of-Stake com sharding para transações rápidas.' },
                { t: 'Comerciantes', d: 'Kotai Payments: aceite cripto com conversão automática. Zero mensalidade, zero taxa.' },
                { t: 'Investidores', d: 'Staking, dividendos e governança on-chain na futura KOTAI Smartchain.' },
              ].map((item, idx, arr) => (
                <div key={item.t} style={{ paddingBottom: 14, marginBottom: idx < arr.length - 1 ? 14 : 0, borderBottom: idx < arr.length - 1 ? `1px solid ${c.border}` : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 4 }}>{item.t}</div>
                  <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.6 }}>{item.d}</div>
                </div>
              ))}
              <a href="https://kotaiproject.io" target="_blank" rel="noopener"
                style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: c.green, textDecoration: 'none', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${c.border}` }}>
                kotaiproject.io <span>↗</span>
              </a>
            </div>

          </div>
        </div>
      </div>

      <footer style={{ borderTop: `1px solid ${c.border}`, padding: '20px 24px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: c.dim, letterSpacing: '0.06em' }}>
        KTI Tracker · dados via DexScreener · análise via Groq AI · não é conselho financeiro
        <span style={{ margin: '0 10px' }}>·</span>
        <a href="/login" style={{ color: c.dim, textDecoration: 'none' }}>admin</a>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 40px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
        .nav-links { display: flex; gap: 32px; }
        .page-wrap { max-width: 1200px; margin: 0 auto; padding: 48px 40px; }
        .page-grid { display: grid; grid-template-columns: 1fr 360px; gap: 20px; align-items: start; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
        .hero-title { font-size: 44px; }
        @media (max-width: 768px) {
          .nav-inner { padding: 0 16px; }
          .nav-links { display: none; }
          .page-wrap { padding: 24px 16px; }
          .page-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(3, 1fr); }
          .hero-title { font-size: 28px; }
        }
      `}</style>
    </div>
  );
}