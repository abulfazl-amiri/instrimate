# Instrimate API

Instrimate helps teachers run their teaching business from one place. A teacher
can manage courses, schedule lessons and timetables, enroll and track students,
share teaching resources with co-teachers, and hand off courses to other
teachers through invites — all scoped to their own account.

The backend is under active development. The current focus is a clean
NestJS, PostgreSQL, and Prisma foundation for Auth and Users.

> The running server currently exposes only Auth and Users. The former legacy
> feature implementations and their API routes have been removed.

## Features

The running application currently includes Auth and Users. The compact
[feature map](./FEATURES.md) summarizes their workflows and records the
relationships from the removed features.

## Tech Stack

- **Runtime:** Node.js (ES modules), TypeScript
- **Framework:** NestJS 11
- **Database:** PostgreSQL with Prisma
- **Cache / token store:** Redis (via ioredis)
- **Validation:** Zod
- **Auth:** jsonwebtoken, bcrypt, cookie-parser
- **Email:** Resend
- **Config:** dotenv
- **Tooling:** ESLint, Prettier

## Architecture

The code is organized by **feature**. Auth and Users are NestJS modules backed
by Prisma. The former Express/Mongoose feature modules were removed; no
MongoDB data is copied. The PostgreSQL schema is created with Prisma `db push`,
without migration files.

```text
apps/server/
├── src/
│   ├── main.ts                # NestJS server bootstrap
│   ├── database/              # Prisma client/module
│   ├── common/                # shared errors, security, validation, helpers
│   ├── infrastructure/        # email and Redis integrations
│   └── features/              # Auth and Users modules
└── prisma/
    └── schema.prisma          # PostgreSQL User model
```

Requests flow through **NestJS controller → guard/validation → service →
Prisma**.

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Compose (PostgreSQL and Redis)

### Install

```bash
pnpm install
```

Run workspace commands from the repository root.

### Configure

Create `apps/server/.env`:

```env
NODE_ENV=development
PORT=3000

POSTGRES_USER=instrimate
POSTGRES_PASSWORD=instrimate_dev
POSTGRES_DB=instrimate
DATABASE_URL=postgresql://instrimate:instrimate_dev@127.0.0.1:5432/instrimate?schema=public
REDIS_URL=redis://127.0.0.1:6378

JWT_SECRET=your_access_token_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
RESET_TOKEN_EXPIRES_IN=15m
SUDO_TOKEN_EXPIRES_IN=10m

RESEND_API_KEY=your_resend_api_key
CLIENT_URL=http://127.0.0.1:3000
```

### Run

For local setup, database initialization, and running the API, follow the
repository root's [Getting started](../../README.md#getting-started)
instructions.

For production, run these commands from the repository root:

```bash
pnpm --filter ./apps/server build
pnpm --filter ./apps/server start
```

The server connects to PostgreSQL, then listens on `PORT` (default `3000`).

## API Overview

All routes are versioned under `/api/v1`.

### Auth — `/api/v1/auth`

Auth is implemented as NestJS REST endpoints. Refresh sessions and reset/sudo
tokens remain in Redis; user records are stored in PostgreSQL.

```http
POST /signup
POST /signin
POST /logout
POST /refresh
POST /password/forgot
POST /password/reset
POST /confirm-password        # auth required — issues a sudo token
```

### Users — `/api/v1/users` _(auth required)_

```http
GET    /me
PATCH  /me
DELETE /me
PATCH  /me/change-password

GET    /                      # admin only
GET    /:id                   # admin only
PATCH  /:id                   # admin only
DELETE /:id                   # admin only
PATCH  /:id/role              # admin only
```

New signups have the `teacher` role. For local development, promote an initial
user through Prisma Studio (`pnpm --filter ./apps/server exec prisma studio`)
before using admin-only endpoints.

Legacy session-management endpoints and the courses, lessons, timetables,
enrollments, invites, students, resources, resource access, and non-teaching
day features have been removed. Auth still uses Redis-backed refresh sessions
for signup, signin, refresh, and logout.

## Error Handling

A shared `AppError` class marks expected errors. The NestJS exception filter
normalizes validation, Prisma uniqueness, and JWT errors. In development it
includes details and stack traces; in production unexpected errors return a
generic message and are logged.

## Status & Roadmap

Working today: Auth (signup/signin, refresh, password recovery, sudo
confirmation) and Users (self-service and admin endpoints), backed by
PostgreSQL/Prisma and Redis.

Future features should be selected before being reintroduced as NestJS/Prisma
modules.

> For the current feature workflows and migration boundary, see
> [`FEATURES.md`](./FEATURES.md).

## Author

Abulfazl Amiri
