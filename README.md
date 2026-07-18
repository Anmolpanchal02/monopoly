# Monopoly Royale

Modern multiplayer Monopoly-inspired web game built with **Next.js 15**, **React 19**, **TypeScript**, **TailwindCSS**, **Socket.io**, **Zustand**, **Prisma**, and **NextAuth**.

## Features

- Private rooms (2–8 players) with optional password, ready checks, kick, host transfer
- JSON-driven 40-space board (`data/board.json`) — edit freely for custom themes
- Chance & Community Chest decks from `data/cards.json`
- Full turn system: dice, doubles → jail, buy/auction, rent, houses/hotels, mortgage, trading, bankruptcy
- Animated board, 3D-style dice, emotes, room chat with typing indicators
- Themes: Classic, Winter, Cyberpunk, Custom
- Spectator mode, replay API, profiles, achievements, leaderboards, daily challenges
- Host admin: pause / resume / restart / kick / transfer host
- Server-authoritative game engine (anti-cheat)
- Auto-reconnect via room code; optional DB game save

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (optional for local demo — game works in-memory without DB)

```bash
cp .env.example .env
npm install
npm run db:push      # requires DATABASE_URL
npm run db:seed
npm run dev          # http://localhost:3000 (Next + Socket.io)
```

### Docker

```bash
docker compose up --build
```

App: http://localhost:3000 · Postgres: localhost:5432

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Custom server with Socket.io |
| `npm run build` | Production Next.js build |
| `npm start` | Run production server |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e tests |
| `npm run db:push` | Sync Prisma schema |
| `npm run db:studio` | Prisma Studio |

## Project Structure

```
app/            Next.js App Router pages & API routes
components/     UI — board, lobby, chat, panels
context/        React GameContext
data/           board.json, cards.json, themes.json, meta.json
game/           Server game engine
hooks/          useSocket and helpers
lib/            auth, prisma, utils, sounds, board loader
prisma/         Schema & seed
server/         Room manager + Socket.io handlers
store/          Zustand client store
types/          Shared TypeScript types
e2e/            Playwright tests
server.ts       Custom HTTP + Socket.io entry
```

## Custom Boards

Edit `data/board.json` — each tile supports `name`, `price`, `rent`, `colorGroup`, etc. Restart the server after changes. Upload community boards via `POST /api/boards/custom` (authenticated).

## Environment

See `.env.example`:

- `DATABASE_URL` — PostgreSQL
- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`

Auth is guest-only — enter a display name to play.

## Deployment

### Recommended (Socket.io)

Socket.io needs a long-lived Node process. Deploy the custom server to:

- **Railway / Render / Fly.io / Docker VPS**

```bash
npm run build
npm start
```

Point `DATABASE_URL` at managed Postgres and set auth secrets.

### Vercel (frontend-only note)

Vercel serverless does **not** support persistent Socket.io. Options:

1. Host the Socket.io server separately and set the client URL
2. Or deploy the full Docker image to a Node host

Frontend pages and API routes (auth, leaderboard, profile) can still run on Vercel if the realtime layer is external.

## Testing

```bash
npm test                 # engine + utils
npx playwright install   # once
npm run test:e2e
```

## License

MIT — inspired by classic property-trading board games. Not affiliated with Hasbro.
