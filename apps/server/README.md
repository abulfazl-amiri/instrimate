# Instrimate API

Instrimate helps teachers run their teaching business from one place. A teacher
can manage courses, schedule lessons and timetables, enroll and track students,
share teaching resources with co-teachers, and hand off courses to other
teachers through invites — all scoped to their own account.

The backend is under active development. The current focus is hardening the
foundation with Auth and Users on NestJS, PostgreSQL, and Prisma before
migrating the remaining features.

> The running server currently exposes only Auth and Users. The other feature
> implementations remain in the repository but are not mounted; their API
> routes return 404 until they are migrated.

## Features

- **Authentication** — signup/signin with JWT access tokens and rotating,
  server-tracked refresh tokens stored in an HTTP-only cookie.
- **Sessions** — list active sessions and revoke them individually or all at
  once. Sensitive actions are protected by a short-lived "sudo" confirmation
  token (re-enter password to unlock).
- **Password recovery** — forgot/reset password flow with email delivery.
- **Courses** — full CRUD, plus nested management of:
  - **Lessons** — per-course lesson records.
  - **Timetable** — the recurring weekly schedule for a course.
  - **Enrollments** — students enrolled in a course.
  - **Invites** — invite another teacher to co-teach or take over a course.
- **Students** — CRUD for a teacher's students and a view of their enrollments.
- **Resources** — CRUD for teaching materials, with per-teacher **access
  sharing** so resources can be granted to or revoked from other teachers.
- **Users** — self-service `/me` routes plus admin-only user management.
- **List controls** — filtering, sorting, field selection, and pagination on
  list endpoints via a shared query utility.

## Tech Stack

- **Runtime:** Node.js (ES modules), TypeScript
- **Framework:** NestJS 11
- **Database:** PostgreSQL with Prisma
- **Cache / token store:** Redis (via ioredis)
- **Validation:** Zod, express-validator, validator, libphonenumber-js
- **Auth:** jsonwebtoken, bcrypt, cookie-parser
- **Email:** Resend (with nodemailer available)
- **Logging:** Morgan
- **Config:** dotenv
- **Tooling:** ESLint, Prettier

## Architecture

The code is organized by **feature**. Auth and Users are NestJS modules backed
by Prisma. Legacy Express/Mongoose feature sources remain unmounted while they
are migrated. No MongoDB data is copied; the PostgreSQL schema is created with
Prisma `db push`, without migration files.

```text
backend/
├── src/
│   ├── app.module.ts          # NestJS application module
│   ├── server.ts              # NestJS server bootstrap
│   ├── database/              # Prisma client/module
│   ├── common/                # shared guards, validation, error handling
│   └── features/
│       ├── auth/              # REST auth endpoints and services
│       └── users/             # /me routes + admin user management
└── prisma/
    └── schema.prisma         # PostgreSQL User model
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

```bash
docker compose --env-file apps/server/.env up -d
pnpm --filter ./apps/server db:push
pnpm --filter ./apps/server dev
```

For production, build first and then start:

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

Sessions, courses, invites, students, resources, and non-teaching days are
legacy features and are not currently mounted.

## Error Handling

A shared `AppError` class marks expected errors. The NestJS exception filter
normalizes validation, Prisma uniqueness, and JWT errors. In development it
includes details and stack traces; in production unexpected errors return a
generic message and are logged.

## Status & Roadmap

Working today: Auth (signup/signin, refresh, password recovery, sudo
confirmation) and Users (self-service and admin endpoints), backed by
PostgreSQL/Prisma and Redis.

Next up:

- Migrate the remaining legacy feature APIs from Mongoose to Prisma.
- Add automated tests when requested.

> For the detailed running state, open issues, and next steps, see
> [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).

## Author

Abulfazl Amiri
