const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const db = require('../db/database');

const router = express.Router();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

const KOTAI_CONTEXT = `
O Kotai (KTI) é um token de criptomoeda na Binance Smart Chain (BSC). 
O ecossistema inclui: Kotai Wallet, Kotai Exchange (DEX), Kotai Payments (pagamentos cripto para empresas), 
Kotai Bank (banco digital sem KYC) e Kotai Space (marketplace descentralizado).
O token usa proof-of-stake e sharding. Preço de pré-venda foi $0.00006.
Site oficial: kotaiproject.io
`;

router.get('/', async (req, res) => {
  try {
    const cached = db.prepare('SELECT * FROM news_cache WHERE id = 1').get();
    const age = cached ? Date.now() - new Date(cached.generated_at).getTime() : Infinity;

    if (cached && age < CACHE_TTL) {
      return res.json({ summary: cached.summary, generated_at: cached.generated_at, cached: true });
    }

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content: `Você é um analista de criptomoedas brasileiro. Escreva resumos claros, diretos e em português do Brasil. Contexto sobre Kotai: ${KOTAI_CONTEXT}`,
          },
          {
            role: 'user',
            content: `Escreva um breve resumo informativo (3 a 4 frases) sobre o token Kotai (KTI) para hoje, ${new Date().toLocaleDateString('pt-BR')}. 
Mencione: o que é o projeto, em qual fase está, e qual o interesse para investidores e comerciantes. 
Seja objetivo e não invente dados de preço. Termine com uma frase de contexto sobre o mercado cripto geral.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) throw new Error(`Groq ${resp.status}`);
    const data = await resp.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) throw new Error('resposta vazia');

    db.prepare(`
      INSERT INTO news_cache (id, summary, generated_at)
      VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET summary=excluded.summary, generated_at=excluded.generated_at
    `).run(summary);

    res.json({ summary, generated_at: new Date().toISOString(), cached: false });
  } catch (err) {
    console.error('news error:', err.message);
    const cached = db.prepare('SELECT * FROM news_cache WHERE id = 1').get();
    if (cached) return res.json({ summary: cached.summary, generated_at: cached.generated_at, cached: true, stale: true });
    res.status(500).json({ error: 'serviço indisponível' });
  }
});

module.exports = router;
