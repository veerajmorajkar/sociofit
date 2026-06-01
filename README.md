# FitSocial

Hyperlocal fitness social media and events platform. Connect with fitness enthusiasts through real-world activities.

## Project Structure

```
fitsocial/
├── mobile/          # React Native + Expo SDK 52 app
├── backend/         # Node.js + Fastify API server
├── docs/            # Project specification & documentation
└── .github/         # CI/CD workflows
```

## Quick Start

### Prerequisites

- Node.js 22+
- Docker (for local Postgres + Redis)
- Expo CLI (`npm install -g expo-cli`)

### Backend

```bash
# Start local databases
cd backend
docker compose up -d

# Copy env and install
cp .env.example .env
npm install

# Push schema to database
npm run db:push

# Seed categories
npm run db:seed

# Start dev server
npm run dev
```

API runs at `http://localhost:3000/api/v1/health`

### Mobile

```bash
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go on your phone.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, Expo SDK 52, Expo Router, NativeWind |
| State | Zustand + TanStack Query |
| Backend | Fastify, TypeScript, Drizzle ORM |
| Database | PostgreSQL 16 + PostGIS |
| Cache | Redis (Upstash) |
| Realtime | Socket.io |
| Search | Typesense |
| Payments | Razorpay |
| Media | Cloudflare R2 + CDN |

## Scripts

```bash
# Root
npm run backend:dev      # Start backend dev server
npm run backend:test     # Run backend tests
npm run mobile:start     # Start Expo dev server
npm run lint             # Lint everything

# Backend
npm run db:generate      # Generate Drizzle migration
npm run db:push          # Push schema to DB
npm run db:seed          # Seed categories
npm run test             # Run tests

# Mobile
npm start                # Start Expo
npm run lint             # Lint mobile code
```

## Documentation

- [Full Specification](docs/SPECIFICATION.md) — Architecture, DB schema, API contracts, implementation plan
- [Product Steering](.kiro/steering/product.md) — Product requirements and vision
