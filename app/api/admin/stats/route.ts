import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });

  const visits_today = (db.prepare(`SELECT COUNT(*) as count FROM visits WHERE date(visited_at) = date('now')`).get() as any).count;
  const visits_total = (db.prepare('SELECT COUNT(*) as count FROM visits').get() as any).count;
  const visits_by_page = db.prepare(`SELECT page, COUNT(*) as count FROM visits GROUP BY page ORDER BY count DESC LIMIT 10`).all();
  const price = db.prepare('SELECT * FROM price_cache WHERE id = 1').get() as any;
  const news = db.prepare('SELECT generated_at FROM news_cache WHERE id = 1').get() as any;

  // busca cotação atual
  let usdBrl = 5.70;
  try {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    usdBrl = d.rates?.BRL || usdBrl;
  } catch {}

  return NextResponse.json({
    visits_today,
    visits_total,
    visits_by_page,
    price_usd: price?.price_usd,
    price_brl: price?.price_usd ? price.price_usd * usdBrl : null,
    price_last_update: price?.updated_at,
    news_last_update: news?.generated_at,
  });
}