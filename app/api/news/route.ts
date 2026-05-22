import { NextResponse } from 'next/server';
import db from '@/lib/db';
import Groq from 'groq-sdk';

const CACHE_TTL = 60 * 60 * 1000;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function fetchNews(): Promise<string> {
  const feeds = [
    'https://br.cointelegraph.com/rss',
    'https://livecoins.com.br/feed/',
    'https://criptofacil.com/feed/',
  ];

  const articles: string[] = [];

  for (const url of feeds) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const xml = await r.text();

      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      for (const item of items.slice(0, 5)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          || item.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
          || item.match(/<description>(.*?)<\/description>/)?.[1] || '';
        const clean = desc.replace(/<[^>]+>/g, '').slice(0, 200);
        if (title) articles.push(`• ${title}: ${clean}`);
      }
    } catch {}
  }

  return articles.slice(0, 12).join('\n');
}

export async function GET(req: Request) {
  try {
    const force = new URL(req.url).searchParams.get('refresh') === '1';
    const cached = db.prepare('SELECT * FROM news_cache WHERE id = 1').get() as any;
    const age = cached ? Date.now() - new Date(cached.generated_at).getTime() : Infinity;

    if (!force && cached && age < CACHE_TTL) {
      return NextResponse.json({ summary: cached.summary, generated_at: cached.generated_at, cached: true });
    }

    const news = await fetchNews();

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `Você é um analista de criptomoedas brasileiro experiente. Escreva análises claras, diretas e em português do Brasil. Seja específico e informativo, evite frases genéricas.`,
        },
        {
          role: 'user',
          content: `Com base nas notícias de hoje (${new Date().toLocaleDateString('pt-BR')}), escreva uma análise de 3 a 4 frases sobre o mercado de criptomoedas e o contexto para o token Kotai (KTI).

O Kotai é um token na BSC com ecossistema de wallet, exchange DEX, sistema de pagamentos (Kotai Payments) e banco digital sem KYC. Está em fase de pré-venda com preço de $0.00006.

Notícias recentes:
${news || 'Sem notícias disponíveis no momento.'}

Mencione tendências relevantes do mercado cripto e como isso se relaciona com projetos como o Kotai. Seja direto e objetivo.`,
        },
      ],
    });

    const summary = completion.choices[0]?.message?.content?.trim() || '';

    db.prepare(`
      INSERT INTO news_cache (id, summary, generated_at) VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET summary=excluded.summary, generated_at=excluded.generated_at
    `).run(summary);

    return NextResponse.json({ summary, generated_at: new Date().toISOString(), cached: false });
  } catch (e: any) {
    console.error('news error:', e.message);
    const cached = db.prepare('SELECT * FROM news_cache WHERE id = 1').get() as any;
    if (cached) return NextResponse.json({ summary: cached.summary, generated_at: cached.generated_at, cached: true, stale: true });
    return NextResponse.json({ error: 'serviço indisponível' }, { status: 500 });
  }
}