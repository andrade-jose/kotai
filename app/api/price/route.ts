import { NextResponse } from 'next/server';
import db from '@/lib/db';

const KTI_ADDRESS = '0xd1fB56e6aEe842708392f2c8ee948bDfABae3AFE';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos
const SALE_MARKUP = parseFloat(process.env.SALE_MARKUP ?? '1.5');

const FX_CACHE = { rate: 5.70, ts: 0 };

async function getUsdBrl(): Promise<number> {
  if (Date.now() - FX_CACHE.ts < 10 * 60 * 1000) return FX_CACHE.rate;
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    FX_CACHE.rate = d.rates?.BRL ?? FX_CACHE.rate;
    FX_CACHE.ts = Date.now();
  } catch {}
  return FX_CACHE.rate;
}

export async function GET() {
  try {
    const cached = db.prepare('SELECT * FROM price_cache WHERE id = 1').get() as any;
    const age = cached ? Date.now() - new Date(cached.updated_at).getTime() : Infinity;

    const usdBrl = await getUsdBrl();

    if (cached && age < CACHE_TTL) {
      const price_usd = cached.price_usd;
      return NextResponse.json({
        price_usd,
        price_brl: price_usd * usdBrl,
        price_sale_usd: price_usd * SALE_MARKUP,
        price_sale_brl: price_usd * SALE_MARKUP * usdBrl,
        usd_brl_rate: usdBrl,
        change_24h: cached.change_24h ?? 0,
        volume_24h: cached.volume_24h ?? 0,
        market_cap: cached.market_cap ?? 0,
        updated_at: cached.updated_at,
        cached: true,
      });
    }

    const resp = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${KTI_ADDRESS}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    );

    if (!resp.ok) throw new Error(`DexScreener ${resp.status}`);
    const data = await resp.json();
    const pairs: any[] = data.pairs ?? [];

    if (pairs.length === 0) {
      if (cached) {
        const price_usd = cached.price_usd;
        return NextResponse.json({
          price_usd,
          price_brl: price_usd * usdBrl,
          price_sale_usd: price_usd * SALE_MARKUP,
          price_sale_brl: price_usd * SALE_MARKUP * usdBrl,
          change_24h: cached.change_24h ?? 0,
          volume_24h: cached.volume_24h ?? 0,
          market_cap: cached.market_cap ?? 0,
          updated_at: cached.updated_at,
          cached: true,
          stale: true,
        });
      }
      return NextResponse.json({ error: 'token não encontrado' }, { status: 404 });
    }

    // Par com maior volume 24h
    const pair = pairs.reduce((best: any, p: any) =>
      (p.volume?.h24 ?? 0) > (best.volume?.h24 ?? 0) ? p : best
    );

    const price_usd = parseFloat(pair.priceUsd);
    const row = {
      price_usd,
      change_24h: pair.priceChange?.h24 ?? 0,
      volume_24h: pair.volume?.h24 ?? 0,
      market_cap: pair.marketCap ?? pair.fdv ?? 0,
    };

    db.prepare(`
      INSERT INTO price_cache (id, price_usd, change_24h, volume_24h, market_cap, updated_at)
      VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        price_usd=excluded.price_usd, change_24h=excluded.change_24h,
        volume_24h=excluded.volume_24h, market_cap=excluded.market_cap,
        updated_at=excluded.updated_at
    `).run(row.price_usd, row.change_24h, row.volume_24h, row.market_cap);

    return NextResponse.json({
      price_usd,
      price_brl: price_usd * usdBrl,
      price_sale_usd: price_usd * SALE_MARKUP,
      price_sale_brl: price_usd * SALE_MARKUP * usdBrl,
      usd_brl_rate: usdBrl,
      change_24h: row.change_24h,
      volume_24h: row.volume_24h,
      market_cap: row.market_cap,
      updated_at: new Date().toISOString(),
      cached: false,
    });
  } catch (err: any) {
    console.error('price error:', err.message);
    const cached = db.prepare('SELECT * FROM price_cache WHERE id = 1').get() as any;
    if (cached) {
      const usdBrl = await getUsdBrl();
      const price_usd = cached.price_usd;
      return NextResponse.json({
        price_usd,
        price_brl: price_usd * usdBrl,
        price_sale_usd: price_usd * SALE_MARKUP,
        price_sale_brl: price_usd * SALE_MARKUP * usdBrl,
        change_24h: cached.change_24h ?? 0,
        volume_24h: cached.volume_24h ?? 0,
        market_cap: cached.market_cap ?? 0,
        updated_at: cached.updated_at,
        cached: true,
        stale: true,
      });
    }
    return NextResponse.json({ error: 'serviço indisponível' }, { status: 500 });
  }
}
