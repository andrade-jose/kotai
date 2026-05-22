const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const db = require('../db/database');

const router = express.Router();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

router.get('/', async (req, res) => {
  try {
    const cached = db.prepare('SELECT * FROM price_cache WHERE id = 1').get();
    const age = cached ? Date.now() - new Date(cached.updated_at).getTime() : Infinity;

    if (cached && age < CACHE_TTL) {
      return res.json({ ...cached, cached: true });
    }

    const resp = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=kotai&vs_currencies=usd,brl&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true',
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    );

    if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
    const data = await resp.json();
    const kti = data.kotai;

    if (!kti) {
      if (cached) return res.json({ ...cached, cached: true, stale: true });
      return res.status(404).json({ error: 'token não encontrado' });
    }

    const row = {
      price_usd: kti.usd,
      price_brl: kti.brl,
      change_24h: kti.usd_24h_change,
      volume_24h: kti.usd_24h_vol,
      market_cap: kti.usd_market_cap,
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
