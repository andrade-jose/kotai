const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const db = require('../db/database');

const router = express.Router();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos
const KTI_ADDRESS = '0xd1fB56e6aEe842708392f2c8ee948bDfABae3AFE';
const SALE_MARKUP = parseFloat(process.env.SALE_MARKUP) || 1.5;

async function fetchUsdToBrl() {
  try {
    const resp = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await resp.json();
    return data.rates?.BRL || 5.70;
  } catch {
    return 5.70; // fallback
  }
}

router.get('/', async (req, res) => {
  try {
    const cached = db.prepare('SELECT * FROM price_cache WHERE id = 1').get();
    const age = cached ? Date.now() - new Date(cached.updated_at).getTime() : Infinity;

    if (cached && age < CACHE_TTL) {
      return res.json({ ...cached, cached: true });
    }

    const resp = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${KTI_ADDRESS}`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    );

    if (!resp.ok) throw new Error(`DexScreener ${resp.status}`);
    const data = await resp.json();
    const pairs = data.pairs;

    if (!pairs || pairs.length === 0) {
      if (cached) return res.json({ ...cached, cached: true, stale: true });
      return res.status(404).json({ error: 'token não encontrado' });
    }

    // Usa o par com maior volume 24h
    const pair = pairs.reduce((best, p) =>
      (p.volume?.h24 || 0) > (best.volume?.h24 || 0) ? p : best
    );

    const price_usd = parseFloat(pair.priceUsd);
    const usdToBrl = await fetchUsdToBrl();

    const row = {
      price_usd,
      price_brl: price_usd * usdToBrl,
      price_sale_usd: price_usd * SALE_MARKUP,
      price_sale_brl: price_usd * SALE_MARKUP * usdToBrl,
      change_24h: pair.priceChange?.h24 || 0,
      volume_24h: pair.volume?.h24 || 0,
      market_cap: pair.marketCap || pair.fdv || 0,
    };

    db.prepare(`
      INSERT INTO price_cache (id, price_usd, price_brl, change_24h, volume_24h, market_cap, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        price_usd=excluded.price_usd, price_brl=excluded.price_brl,
        change_24h=excluded.change_24h, volume_24h=excluded.volume_24h,
        market_cap=excluded.market_cap, updated_at=excluded.updated_at
    `).run(row.price_usd, row.price_brl, row.change_24h, row.volume_24h, row.market_cap);

    res.json({ ...row, updated_at: new Date().toISOString(), cached: false });
  } catch (err) {
    console.error('price error:', err.message);
    const cached = db.prepare('SELECT * FROM price_cache WHERE id = 1').get();
    if (cached) return res.json({ ...cached, cached: true, stale: true });
    res.status(500).json({ error: 'serviço indisponível' });
  }
});

module.exports = router;
