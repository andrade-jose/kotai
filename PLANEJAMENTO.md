# Kotai Tracker — Planejamento do Projeto

## Visão geral
Site público de acompanhamento do token KTI com painel admin privado.
Hospedado em home server Ubuntu/Debian, exposto via Cloudflare Tunnel.

---

## Stack

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend público | HTML + JS puro | Sem build, fácil de manter |
| Backend | Node.js + Express | Leve, roda bem em home server |
| Banco de dados | SQLite (better-sqlite3) | Zero configuração, tudo num arquivo |
| Autenticação | Google OAuth 2.0 + JWT | Só admin precisa logar |
| IA (resumo notícias) | Groq API (llama-3.1-8b-instant) | Grátis, ultra rápido |
| Preço KTI | CoinGecko API (free tier) | Sem chave necessária |
| Servidor web | Nginx | Reverse proxy + servir estático |
| Tunnel | Cloudflare Tunnel (cloudflared) | Sem abrir porta no roteador |
| Processo | PM2 | Manter Node vivo, restart automático |

---

## Estrutura de arquivos

```
kotai-site/
├── public/                  # Arquivos servidos pelo Nginx (frontend público)
│   ├── index.html           # Página principal (preço, conversor, notícias IA)
│   ├── login.html           # Página de login Google
│   └── admin/
│       └── index.html       # Painel admin (protegido por JWT no frontend)
├── server/
│   ├── index.js             # Entry point Express
│   ├── routes/
│   │   ├── auth.js          # Google OAuth callback + geração JWT
│   │   ├── price.js         # Proxy CoinGecko (evita CORS)
│   │   └── news.js          # Busca notícias + resumo Groq
│   ├── middleware/
│   │   └── auth.js          # Verifica JWT nas rotas protegidas
│   └── db/
│       ├── database.js      # Conexão SQLite
│       └── schema.sql       # Tabelas
├── .env                     # Chaves secretas (nunca no git)
├── .env.example             # Template público
├── nginx.conf               # Config do Nginx
├── ecosystem.config.js      # Config PM2
└── package.json
```

---

## Rotas da API

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/price` | pública | Preço KTI atual (proxy CoinGecko) |
| GET | `/api/news` | pública | Resumo de notícias gerado pelo Groq |
| GET | `/auth/google` | pública | Inicia fluxo OAuth Google |
| GET | `/auth/google/callback` | pública | Callback OAuth, gera JWT |
| GET | `/auth/me` | JWT | Retorna dados do admin logado |
| GET | `/api/admin/stats` | JWT | Stats do site (visitas, etc) |

---

## Banco de dados (SQLite)

```sql
-- Admins autorizados (Google OAuth)
CREATE TABLE admins (
  id INTEGER PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cache de preço (evita bater na CoinGecko toda hora)
CREATE TABLE price_cache (
  id INTEGER PRIMARY KEY,
  price_usd REAL,
  price_brl REAL,
  change_24h REAL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cache do resumo de notícias
CREATE TABLE news_cache (
  id INTEGER PRIMARY KEY,
  summary TEXT,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Log de visitas (simples)
CREATE TABLE visits (
  id INTEGER PRIMARY KEY,
  page TEXT,
  visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Fluxo de autenticação

```
1. Admin clica "Entrar com Google" em /login.html
2. Redireciona para /auth/google
3. Google autentica e chama /auth/google/callback
4. Backend verifica se o google_id está na tabela admins
5. Se sim → gera JWT com validade de 7 dias → redireciona para /admin
6. Se não → redireciona para /login.html?erro=nao_autorizado
7. Rotas /api/admin/* verificam o JWT em cada request
```

---

## Variáveis de ambiente (.env)

```env
# Servidor
PORT=3001
NODE_ENV=production
JWT_SECRET=gerar_com_openssl_rand_hex_32

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://seudominio.com.br/auth/google/callback

# Groq
GROQ_API_KEY=

# Admin autorizado
ADMIN_GOOGLE_EMAIL=seuemail@gmail.com
```

---

## Nginx — configuração resumida

```nginx
server {
    listen 80;
    server_name seudominio.com.br;

    # Frontend estático
    location / {
        root /home/user/kotai-site/public;
        try_files $uri $uri/ /index.html;
    }

    # API Node
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }

    location /auth/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
}
```

---

## Cloudflare Tunnel

```bash
# Instalar cloudflared
curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install cloudflared

# Autenticar e criar tunnel
cloudflared tunnel login
cloudflared tunnel create kotai-tunnel

# Apontar domínio para o tunnel
cloudflared tunnel route dns kotai-tunnel seudominio.com.br

# Rodar como serviço
cloudflared service install
```

---

## Ordem de execução

- [ ] 1. Verificar ambiente do servidor (Node, Nginx, PM2)
- [ ] 2. Criar projeto Google OAuth no Google Cloud Console
- [ ] 3. Criar conta Groq e pegar API key
- [ ] 4. Gerar e configurar `.env`
- [ ] 5. Codificar `server/` (backend Express)
- [ ] 6. Codificar `public/index.html` (frontend)
- [ ] 7. Codificar `public/admin/index.html` (painel admin)
- [ ] 8. Configurar Nginx
- [ ] 9. Configurar PM2
- [ ] 10. Instalar e configurar Cloudflare Tunnel
- [ ] 11. Testar tudo

---

## Custo estimado

| Item | Custo |
|---|---|
| Servidor (home server) | R$ 0 |
| Cloudflare Tunnel | R$ 0 |
| CoinGecko API | R$ 0 |
| Groq API | R$ 0 (100 req/min grátis) |
| Domínio .com.br | ~R$ 40/ano |
| **Total mensal** | **~R$ 0** |
