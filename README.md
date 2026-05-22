# Kotai Tracker

Site público de acompanhamento do token **KTI (Kotai)**, com painel administrativo privado.

Desenvolvido para rodar em home server, exposto via Cloudflare Tunnel — custo mensal zero.

## Funcionalidades

- Preço em tempo real (USD e BRL) via CoinGecko API
- Conversor de valores KTI ↔ BRL/USD
- Resumo de notícias gerado por IA (Groq / Llama 3)
- Painel admin protegido por Google OAuth 2.0 + JWT
- Log de visitas por página

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + JS puro (sem framework) |
| Backend | Node.js + Express |
| Banco de dados | SQLite (better-sqlite3) |
| Autenticação | Google OAuth 2.0 + JWT |
| Resumo IA | Groq API (llama-3.1-8b-instant) |
| Preço | CoinGecko API (free tier) |
| Servidor web | Nginx (reverse proxy) |
| Tunnel | Cloudflare Tunnel |
| Processo | PM2 |

## Estrutura

```
kotai/
├── public/
│   ├── index.html        # Página principal
│   ├── login.html        # Login Google
│   └── admin/
│       └── index.html    # Painel admin
├── server/
│   ├── index.js          # Entry point Express
│   ├── routes/
│   │   ├── auth.js       # Google OAuth + JWT
│   │   ├── price.js      # Proxy CoinGecko
│   │   ├── news.js       # Notícias + Groq
│   │   └── admin.js      # Stats do painel
│   ├── middleware/
│   │   └── auth.js       # Verificação JWT
│   └── db/
│       ├── database.js   # Conexão SQLite
│       └── schema.sql    # Schema das tabelas
├── .env.example
├── docker-compose.yml
└── Dockerfile
```

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Conta no [Google Cloud Console](https://console.cloud.google.com) para OAuth
- Conta na [Groq](https://console.groq.com) para a API de IA

### Instalação

```bash
git clone https://github.com/seu-usuario/kotai-tracker
cd kotai-tracker
npm install
cp .env.example .env
# Edite .env com suas chaves
npm start
```

### Variáveis de ambiente

Veja `.env.example` para todas as variáveis necessárias.

```env
PORT=3002
NODE_ENV=production
JWT_SECRET=           # openssl rand -hex 32
GOOGLE_CLIENT_ID=     # Google Cloud Console
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://seudominio.com/auth/google/callback
GROQ_API_KEY=         # console.groq.com
ADMIN_EMAIL=          # email do admin autorizado
```

### Docker

```bash
docker compose up -d
```

## API

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/price` | pública | Preço KTI atual |
| GET | `/api/news` | pública | Resumo de notícias por IA |
| GET | `/auth/google` | pública | Inicia fluxo OAuth |
| GET | `/auth/google/callback` | pública | Callback OAuth |
| GET | `/auth/me` | JWT | Dados do admin |
| GET | `/api/admin/stats` | JWT | Stats do site |

## Infraestrutura

O site roda em home server Ubuntu com:
- **Nginx** como reverse proxy
- **PM2** para manter o processo Node vivo
- **Cloudflare Tunnel** para exposição sem abrir portas no roteador

Veja `PLANEJAMENTO.md` para detalhes completos da arquitetura.

## Licença

MIT
