# KTI Tracker

Tracker em tempo real do token **KTI (Kotai)** na Binance Smart Chain.

🌐 **Live:** [kotaitracker.online](https://kotaitracker.online)

---

## Funcionalidades

- **Preço ao vivo** — busca direto na DexScreener (BSC/PancakeSwap), cache de 2 min
- **Preço de venda** — markup configurável sobre a cotação (padrão +50%)
- **Conversor KTI ↔ BRL** em tempo real
- **Calculadora de portfólio** — valor de mercado e valor de venda
- **Análise diária por IA** — RSS de portais cripto brasileiros + resumo via Groq (Llama 3)
- **Painel admin** — protegido por Google OAuth, mostra estatísticas de visitas
- **Zero custo** — home server + Cloudflare Tunnel + APIs gratuitas

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS |
| Banco de dados | SQLite (better-sqlite3) |
| Autenticação | next-auth + Google OAuth 2.0 |
| Preço | DexScreener API |
| Câmbio USD/BRL | Open Exchange Rates |
| IA | Groq API (llama-3.1-8b-instant) |
| Deploy | Docker + Cloudflare Tunnel |

---

## Estrutura

```
kotai/
├── app/
│   ├── page.tsx               # Página principal
│   ├── login/page.tsx         # Login Google
│   ├── admin/page.tsx         # Painel admin
│   └── api/
│       ├── price/route.ts     # Preço KTI via DexScreener
│       ├── news/route.ts      # Análise IA via Groq
│       ├── auth/              # next-auth (Google OAuth)
│       └── admin/
│           ├── stats/route.ts # Estatísticas de visitas
│           └── price/route.ts # Atualização manual de preço
├── lib/
│   ├── db.ts                  # SQLite (better-sqlite3)
│   └── auth.ts                # Configuração next-auth
├── public/
│   └── kotai-logo.svg
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

---

## API

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/price` | pública | Preço KTI (USD, BRL, venda, variação 24h) |
| GET | `/api/news` | pública | Resumo de notícias gerado por IA |
| GET | `/api/admin/stats` | sessão | Visitas por página |
| POST | `/api/admin/price` | sessão | Atualização manual de preço |

**Exemplo de resposta `/api/price`:**
```json
{
  "price_usd": 0.00007487,
  "price_brl": 0.00037474,
  "price_sale_usd": 0.00011231,
  "price_sale_brl": 0.00056211,
  "usd_brl_rate": 5.005,
  "change_24h": -1.45,
  "volume_24h": 3462.54,
  "market_cap": 74872190,
  "updated_at": "2026-05-22T20:50:15.233Z"
}
```

---

## Como rodar localmente

```bash
git clone https://github.com/andrade-jose/kotai.git
cd kotai
npm install
cp .env.example .env.local
# Preencha as variáveis no .env.local
npm run dev
```

### Variáveis de ambiente

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=          # openssl rand -hex 32

GOOGLE_CLIENT_ID=         # console.cloud.google.com
GOOGLE_CLIENT_SECRET=

ADMIN_EMAILS=seuemail@gmail.com

GROQ_API_KEY=             # console.groq.com

SALE_MARKUP=1.5           # markup de venda (1.5 = +50%)
```

### Docker

```bash
docker compose up -d --build
```

---

## Deploy (home server)

O site roda em um servidor doméstico exposto via **Cloudflare Tunnel**, sem abrir portas no roteador.

```
Internet → Cloudflare Tunnel → Nginx → Docker (Next.js :3002)
```

Para atualizar o servidor após um push:

```bash
cd /srv/kotai && git pull && docker compose up -d --build
```

---

## Licença

MIT
