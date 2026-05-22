# Estágio 1: Instalação de dependências e Build
FROM node:20-slim AS builder
WORKDIR /app

# Instalar dependências básicas de compilação necessárias para módulos nativos (como better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de configuração de pacotes
COPY package*.json ./
RUN npm ci

# Copiar o restante dos arquivos do projeto
COPY . .

# Desabilitar telemetria do Next.js durante o build
ENV NEXT_TELEMETRY_DISABLED=1

# Executar o build do Next.js
RUN npm run build

# Estágio 2: Ambiente de execução limpo
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copiar apenas os arquivos necessários do estágio de build
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# O Next.js neste projeto foi configurado na porta 3002
EXPOSE 3002

CMD ["npm", "start"]
