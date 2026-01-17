# Deployment

## Visão Geral

O sistema é deployado como containers Docker, ideal para uso com Portainer em um servidor doméstico.

## Arquitetura de Deploy

```
┌─────────────────────────────────────────────────────┐
│                    Docker Host                       │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐                 │
│  │  home-chores│    │  PostgreSQL │                 │
│  │    (app)    │───▶│    (db)     │                 │
│  │   :3000     │    │   :5432     │                 │
│  └──────┬──────┘    └──────┬──────┘                 │
│         │                  │                         │
│         ▼                  ▼                         │
│  ┌─────────────┐    ┌─────────────┐                 │
│  │   network   │    │   volume    │                 │
│  │ home-chores │    │ postgres_data│                │
│  └─────────────┘    └─────────────┘                 │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   Impressora    │
│   Térmica       │
│  192.168.1.230  │
└─────────────────┘
```

## Arquivos de Configuração

### Dockerfile

```dockerfile
# Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build application
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client* ./node_modules/.pnpm/

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
# docker-compose.yml

version: '3.8'

services:
  app:
    build: .
    container_name: home-chores
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://homechores:${DB_PASSWORD}@db:5432/homechores
      - APP_PIN=${APP_PIN:-1234}
      - PRINTER_IP=${PRINTER_IP:-192.168.1.230}
      - TZ=America/Sao_Paulo
    depends_on:
      db:
        condition: service_healthy
    networks:
      - home-chores-network
    # Necessário para acessar a impressora na rede local
    extra_hosts:
      - "host.docker.internal:host-gateway"

  db:
    image: postgres:16-alpine
    container_name: home-chores-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=homechores
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=homechores
      - TZ=America/Sao_Paulo
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U homechores"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - home-chores-network

networks:
  home-chores-network:
    driver: bridge

volumes:
  postgres_data:
```

### .env.example

```env
# .env.example

# Database
DB_PASSWORD=sua_senha_segura_aqui

# Application
APP_PIN=1234

# Printer
PRINTER_IP=192.168.1.230

# Timezone
TZ=America/Sao_Paulo
```

### next.config.ts

```typescript
// next.config.ts

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['node-thermal-printer'],
  },
}

export default nextConfig
```

## Deploy com Portainer

### Passo a Passo

1. **Preparar arquivos**

   Clone o repositório no servidor:
   ```bash
   git clone https://github.com/seu-usuario/home-chores.git
   cd home-chores
   ```

2. **Configurar variáveis**

   Crie o arquivo `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```

   Configure os valores:
   ```env
   DB_PASSWORD=MinhaSenhaSegura123
   APP_PIN=1234
   PRINTER_IP=192.168.1.230
   ```

3. **Via Portainer UI**

   a. Acesse Portainer (geralmente `http://servidor:9000`)

   b. Vá em **Stacks** → **Add stack**

   c. Escolha **Upload** e selecione `docker-compose.yml`

   d. Em **Environment variables**, adicione:
      - `DB_PASSWORD`: sua senha do banco
      - `APP_PIN`: PIN de acesso
      - `PRINTER_IP`: IP da impressora

   e. Clique em **Deploy the stack**

4. **Via linha de comando**

   ```bash
   # Build e start
   docker compose up -d --build

   # Ver logs
   docker compose logs -f app

   # Executar migrations
   docker compose exec app pnpm prisma migrate deploy

   # Seed inicial (opcional)
   docker compose exec app pnpm prisma db seed
   ```

### Verificar Deploy

```bash
# Status dos containers
docker compose ps

# Logs do app
docker compose logs app

# Logs do banco
docker compose logs db

# Testar conexão
curl http://localhost:3000/api/settings
```

## Atualizações

### Atualizar Aplicação

```bash
# Pull das mudanças
git pull origin main

# Rebuild e restart
docker compose up -d --build

# Executar migrations (se houver)
docker compose exec app pnpm prisma migrate deploy
```

### Via Portainer

1. Vá em **Stacks** → **home-chores**
2. Clique em **Pull and redeploy**
3. Aguarde o rebuild

## Backup e Restore

### Backup do Banco

```bash
# Criar backup
docker compose exec db pg_dump -U homechores homechores > backup_$(date +%Y%m%d).sql

# Backup compactado
docker compose exec db pg_dump -U homechores homechores | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore do Banco

```bash
# Restore de backup
cat backup_20240116.sql | docker compose exec -T db psql -U homechores homechores

# Restore de backup compactado
gunzip -c backup_20240116.sql.gz | docker compose exec -T db psql -U homechores homechores
```

### Backup Automático (Cron)

Adicione ao crontab do host:

```bash
# Editar crontab
crontab -e

# Adicionar linha (backup diário às 3h)
0 3 * * * cd /path/to/home-chores && docker compose exec -T db pg_dump -U homechores homechores | gzip > /backups/homechores_$(date +\%Y\%m\%d).sql.gz
```

## Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker compose logs -f app

# Verificar se o banco está pronto
docker compose exec db pg_isready -U homechores

# Reiniciar containers
docker compose restart
```

### Erro de conexão com banco

```bash
# Verificar variável DATABASE_URL
docker compose exec app env | grep DATABASE

# Testar conexão
docker compose exec app npx prisma db pull
```

### Impressora não funciona

```bash
# Testar ping para impressora
docker compose exec app ping -c 3 192.168.1.230

# Verificar se a porta está aberta
docker compose exec app nc -zv 192.168.1.230 9100
```

### Migrations falhando

```bash
# Ver status das migrations
docker compose exec app pnpm prisma migrate status

# Reset do banco (CUIDADO: apaga dados)
docker compose exec app pnpm prisma migrate reset

# Forçar migration
docker compose exec app pnpm prisma migrate deploy --force
```

## Requisitos do Servidor

### Mínimos
- CPU: 1 core
- RAM: 1GB
- Disco: 10GB
- Docker 24+
- Docker Compose v2

### Recomendados
- CPU: 2 cores
- RAM: 2GB
- Disco: 20GB (com margem para backups)

### Rede
- Acesso à rede local (para impressora)
- Porta 3000 disponível
- Opcional: reverse proxy (Traefik, nginx) para HTTPS

## Segurança

### Recomendações

1. **Senha do banco**: Use senha forte gerada aleatoriamente
   ```bash
   openssl rand -base64 32
   ```

2. **Acesso local**: O app foi projetado para rede local. Não exponha diretamente para internet.

3. **Firewall**: Libere apenas portas necessárias
   ```bash
   # UFW example
   ufw allow from 192.168.1.0/24 to any port 3000
   ```

4. **Atualizações**: Mantenha imagens Docker atualizadas
   ```bash
   docker compose pull
   docker compose up -d
   ```

### Com HTTPS (Opcional)

Se quiser HTTPS, use um reverse proxy. Exemplo com Traefik:

```yaml
# Adicionar ao docker-compose.yml
services:
  app:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.homechores.rule=Host(`casa.local`)"
      - "traefik.http.routers.homechores.tls=true"
```
