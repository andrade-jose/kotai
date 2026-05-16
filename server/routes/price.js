const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const db = require('../db/database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const cached = db.prepare('SELECT * FROM price_cache WHERE id = 1').get();
    if (!cached) return res.status(404).json({ error: 'preço não configurado' });

    // busca cotação USD/BRL para converter
    let usdBrl = 5.70; // fallback
    try {
      const fx = await fetch(
        'https://api.exchangerate-api.com/v4/latest/USD',
        { signal: AbortSignal.timeout(5000) }
      );
      const fxData = await fx.json();
      usdBrl = fxData.rates?.BRL || usdBrl;
    } catch {}

    const price_brl = cached.price_usd * usdBrl;

    res.json({
      price_usd: cached.price_usd,
      price_brl,
      change_24h: cached.change_24h || 0,
      volume_24h: cached.volume_24h || 0,
      market_cap: cached.market_cap || 0,
      updated_at: cached.updated_at,
      manual: true,
    });
  } catch (err) {
    console.error('price error:', err.message);
    res.status(500).json({ error: 'serviço indisponível' });
  }
});

module.exports = router;