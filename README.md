# ClubMy Ofertas

Plataforma web para agregação e comparação de ofertas de supermercados por região.

- Frontend (produção): `https://www.clubmy.com.br`
- Backend/API (produção): `https://api.clubmy.com.br`

## Arquitetura

### Frontend
- Next.js (App Router) + React
- TailwindCSS
- Axios para consumo da API

### Backend
- Node.js + Express
- PostgreSQL
- Prisma ORM
- Redis para cache
- Scheduler com `node-cron`
- Coleta via Playwright
- OCR via Tesseract.js

## Estrutura de pastas

```bash
.
├── frontend/         # App Next.js
├── backend/          # API Express + Prisma
└── README.md
```

## Como rodar localmente

### 1) Pré-requisitos
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### 2) Instalação

```bash
npm install
```

### 3) Configurar ambiente

```bash
cp backend/.env.example backend/.env
```

Ajuste `DATABASE_URL` e `REDIS_URL` no arquivo `backend/.env`.

### 4) Banco de dados

```bash
npm run prisma:generate --workspace backend
npm run prisma:migrate --workspace backend
npm run seed --workspace backend
```

### 5) Desenvolvimento (frontend + backend)

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

## Rotas da API

- `GET /regions`
- `GET /supermarkets?city=`
- `GET /offers?city=&category=&search=&supermarket=`
- `GET /compare?product=`

## Funcionalidades implementadas

- Seleção de região (cidade/estado via supermercados)
- Filtros de ofertas por categoria/preço implícito (ordenação)/supermercado/busca
- Comparador de preços
- Normalização básica de produtos e categorização automática
- Job diário para atualização de ofertas e limpeza de expiradas (`03:00`)
- Cache com Redis (TTL de 5 minutos)
- Estrutura para OCR e scraping

## Deploy

### Frontend (Vercel recomendado)

1. Conectar repositório na Vercel.
2. Definir projeto com root `frontend/`.
3. Definir variável:
   - `NEXT_PUBLIC_API_URL=https://api.clubmy.com.br`
4. Build command padrão: `npm run build`
5. Output padrão Next.js.

### Backend (Railway recomendado)

1. Criar serviço apontando para a pasta `backend/`.
2. Variáveis de ambiente obrigatórias:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `FRONTEND_URL=https://www.clubmy.com.br`
   - `PORT` (fornecida pela plataforma)
3. Start command:
   - `npm run start`
4. Build command:
   - `npm run build`

## DNS e domínio

### Objetivo
- `www.clubmy.com.br` → frontend
- `api.clubmy.com.br` → backend

### Configuração sugerida (Cloudflare/Registro.br)

#### Frontend na Vercel
- Tipo `CNAME`
- Host: `www`
- Valor: `cname.vercel-dns.com`

#### Backend na Railway/Render
- Tipo `CNAME` (ou `A`, dependendo da plataforma)
- Host: `api`
- Valor: domínio público fornecido pela plataforma (ex.: `clubmy-api.up.railway.app`)

#### Redirecionamento de raiz
- `clubmy.com.br` → redirecionar 301 para `https://www.clubmy.com.br`

## HTTPS / SSL

- **Vercel, Railway e Render** já emitem SSL automaticamente.
- Se usar VPS/manual:
  - Instalar Nginx
  - Emitir certificado com Let's Encrypt (`certbot`)
  - Renovação automática (`systemctl enable certbot.timer`)

## Cron / Atualização diária

- Em runtime do backend o scheduler roda diariamente às 03:00 (`node-cron`).
- Execução manual:

```bash
npm run cron:update --workspace backend
```

## Extras planejados

- Login e autenticação
- Favoritos
- Alertas de preço
- Histórico de preços com séries temporais
- Correção OCR com modelos de IA
