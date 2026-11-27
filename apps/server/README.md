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
- **API:** GraphQL (Users) and REST (Auth)
- **Database:** PostgreSQL with Prisma
- **Cache / token store:** Redis (via ioredis)
- **Validation:** Zod
- **Auth:** jsonwebtoken, bcrypt, cookie-parser
- **Email:** Mailpit over SMTP locally; Resend in production
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

Requests flow through **NestJS resolver/controller → guard/validation →
service → Prisma**.

## Getting Started

### Prerequisites

- Node.js 24+
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

PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS=60

EMAIL_PROVIDER=smtp
EMAIL_SMTP_HOST=127.0.0.1
EMAIL_SMTP_PORT=1025
EMAIL_SMTP_SECURE=false
CLIENT_URL=http://127.0.0.1:3000
CORS_ORIGINS=http://127.0.0.1:3000,https://example.com
```

With the local `smtp` settings, start Mailpit from the repository root:

```bash
docker compose --env-file apps/server/.env up -d mailpit
```

View captured emails at [http://127.0.0.1:8025](http://127.0.0.1:8025).
To send real email, set `EMAIL_PROVIDER=resend` and provide `RESEND_API_KEY`.
`CORS_ORIGINS` is a comma-separated list of allowed origins; `CLIENT_URL` is
also allowed for compatibility and is used to build authentication links.

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

Auth REST routes are versioned under `/api/v1`. Users operations are available
at `http://127.0.0.1:3000/graphql` by default. The server writes its generated
GraphQL schema to `apps/server/schema.gql` on startup, which can be inspected
without Apollo Sandbox. The file describes the API but is not an interactive
GraphQL client. The public `health` query returns `"ok"` without requiring
authentication. CORS allows Apollo Sandbox and the origins configured by
`CORS_ORIGINS` or `CLIENT_URL`.

### Auth — `/api/v1/auth`

Auth is implemented as NestJS REST endpoints. Refresh sessions and reset/sudo
tokens remain in Redis; user records are stored in PostgreSQL.

```http
POST /signup
POST /verify-email
POST /resend-verification
POST /signin
POST /logout
POST /refresh
POST /password/forgot
POST /password/reset
POST /confirm-password        # auth required — issues a sudo token
```

Signup creates an active but unverified account and emails a one-time code.
`/verify-email` verifies the code and then returns an access token and refresh
cookie; sign-in and protected endpoints require a verified email.

### Users — `/graphql` _(auth required)_

Send the access token in the `Authorization: Bearer <token>` header. Users
operations are GraphQL queries and mutations:

```graphql
query CurrentUser {
  me {
    id
    name
    email
    role
  }
}

mutation UpdateMyProfile {
  updateMe(input: { name: "New name" }) {
    id
    name
    email
  }
}

query AdminUserList {
  users(filter: { role: TEACHER, limit: 10, page: 1, sort: "-createdAt" }) {
    results
    totalCount
    page
    limit
    totalPages
    hasNextPage
    hasPreviousPage
    data {
      id
      name
      email
      role
    }
  }
}
```

The admin `users` query uses offset pagination. `page` defaults to `1`;
`limit` defaults to `10` and is capped at `100`. `results` is the number of
users on the current page, while `totalCount` is the number matching the
filters across all pages.

New signups have the `teacher` role. For local development, promote an initial
user through Prisma Studio (`pnpm --filter ./apps/server exec prisma studio`)
before using admin-only Users queries and mutations. The `me`,
`updateMe`, `deleteMe`, and `changeMyPassword` operations are self-service;
`users`, `user`, `updateUser`, `deleteUser`, and `updateUserRole` are admin-only.

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
