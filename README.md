# Meeting AI

Real-time AI-powered meeting platform (Next.js + Express + PostgreSQL).

## Prerequisites

- Node.js 20+
- PostgreSQL (e.g. Supabase)
- [Clerk](https://clerk.com) application

## Setup

### 1. Environment

Copy env templates and fill in values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

Use the same Clerk application for both apps. `CLERK_SECRET_KEY` goes in `server/.env`; publishable key in `client/.env.local`.

### 2. Database

```bash
cd server
npm install
npm run db:generate
npm run db:migrate   # or: npm run db:push
```

### 3. Run locally

**Both** the API (port 5000) and Next.js (port 3000) must be running. If you only start the client, you will see `Cannot reach API at http://localhost:5000`.

**Option A — one command (recommended):**

```bash
npm install
npm run dev
```

**Option B — two terminals:**

Terminal 1 — API:

```bash
cd server
npm run dev
```

Wait for `Server running on port 5000`, then terminal 2 — client:

```bash
cd client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, and visit `/dashboard`. The client syncs your Clerk user to PostgreSQL on first load.

## Project layout

| Path | Role |
|------|------|
| `client/` | Next.js 16 app (Clerk, Tailwind, shadcn) |
| `server/` | Express API + Socket.IO + Prisma |

## API

All `/api/*` routes require a Clerk session token (`Authorization: Bearer <token>`).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users/sync` | Upsert user from Clerk profile |
| `GET` | `/api/users/me` | Current Prisma user (requires prior sync) |
| `POST` | `/api/meetings` | Create meeting (`title`; host from auth) |
| `GET` | `/api/meetings` | List meetings for current user |
| `GET` | `/api/meetings/room/:roomId` | Meeting metadata by room |
| `PATCH` | `/api/meetings/:id/end` | End meeting (host only) |
| `GET` | `/api/livekit/status` | LiveKit config status (no auth) |
| `GET` | `/api/transcription/status` | Deepgram config status (no auth) |
| `GET` | `/api/meetings/room/:roomId/transcripts` | Transcript history |
| `POST` | `/api/livekit/token` | LiveKit join token (`roomId` in body) |

### LiveKit Cloud (video & audio)

1. Sign up at [cloud.livekit.io](https://cloud.livekit.io) and create a project.
2. In **Settings → Keys**, copy the API Key, API Secret, and WebSocket URL.
3. Add to `server/.env`:

```env
LIVEKIT_API_KEY="API..."
LIVEKIT_API_SECRET="..."
LIVEKIT_URL="wss://your-project.livekit.cloud"
```

4. Add the same WebSocket URL to `client/.env.local`:

```env
NEXT_PUBLIC_LIVEKIT_URL="wss://your-project.livekit.cloud"
```

5. Restart `npm run dev`. When joining a meeting you will see LiveKit’s **PreJoin** device check, then the official **video grid + control bar** UI.

Without LiveKit keys, the meeting room runs in **preview mode** (chat and presence only).

### Deepgram (live transcription)

1. Create an API key at [console.deepgram.com](https://console.deepgram.com).
2. Add to `server/.env`:

```env
DEEPGRAM_API_KEY="..."
```

3. Restart `npm run dev`. When you join a meeting with the mic on, speech is streamed to Deepgram Nova-2 and captions appear in the **Live transcript** panel. Final lines are saved to the `Transcript` table.

Check config: `GET /api/transcription/status`

### Clerk webhooks (optional, server-side user sync)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/webhooks/clerk` | Svix signature (`CLERK_WEBHOOK_SIGNING_SECRET`) |

Handles `user.created`, `user.updated`, and `user.deleted`. For local testing:

1. Run `ngrok http 5000` (or similar).
2. In Clerk Dashboard → Webhooks, add endpoint `https://<tunnel-host>/api/webhooks/clerk`.
3. Copy the signing secret into `server/.env` as `CLERK_WEBHOOK_SIGNING_SECRET`.

Client `POST /api/users/sync` still works as a fallback when the app loads.

## Protected routes (client)

`/dashboard`, `/meet/*`, `/notes/*`, `/settings/*` require Clerk sign-in.

## Architecture

<img width="825" height="594" alt="image" src="https://github.com/user-attachments/assets/17f7f393-5a0a-4f18-89d9-39e0d7a4f358" />

