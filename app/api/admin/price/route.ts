import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });

  const { price_brl } = await req.json();
  const val = parseFloat(price_brl);
  if (!val || val <= 0) return NextResponse.json({ error: 'preço inválido' }, { status: 400 });

  // busca cotação do dólar para converter
  let usdBrl = 5.70;
  try {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    usdBrl = d.rates?.BRL || usdBrl;
  } catch {}

  const price_usd = val / usdBrl;

  db.prepare(`
    INSERT INTO price_cache (id, price_usd, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET price_usd=excluded.price_usd, updated_at=excluded.updated_at
  `).run(price_usd);

  return NextResponse.json({ ok: true, price_brl: val, price_usd });
}
