# Ortace Frontend — Hackathon

Quick reference for running and demoing the frontend at a hackathon.

## Run locally

```bash
npm install
npm run dev
```

Open **http://localhost:8080**

## Demo flow

1. **Landing** (`/`) — Pitch + “Get started” / “Try the Widget Demo”
2. **Sign in** (`/auth`) — “Continue with Google” (needs backend OAuth configured)
3. **Widget demo** (`/dummy`) — Fake dashboard with the green feedback FAB in the corner
4. **Overview** (`/overview`) — After login, dashboard (needs backend)

## Env

- Copy `.env.example` to `.env` if you need to point at a different API.
- Prod build uses `https://prod-ortrace-api-jtjotridxa-uc.a.run.app` by default.

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static host or `npm run preview`.

---
