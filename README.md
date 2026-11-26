# Instrimate

Instrimate is a pnpm monorepo. Applications live in `apps/`, and reusable
workspace packages live in `packages/`.

## Repository structure

```text
apps/
  server/       NestJS API
  web/          Next.js web app
  mobile/       Planned mobile app
packages/
  shared/       Shared code, when needed by multiple apps
```

`apps/server` and `apps/web` exist today. The workspace patterns in
`pnpm-workspace.yaml` automatically include future apps under `apps/` and
packages under `packages/`.

## Prerequisites

- Node.js 20 or newer
- pnpm (the version is pinned in the root `package.json`; Corepack can use it)
- Docker Compose

## Getting started

Run commands from the repository root unless noted otherwise:

```bash
corepack enable
pnpm install
cp apps/server/.env.example apps/server/.env
```

Set the values in `apps/server/.env`, then start the local dependencies,
initialize the database schema, and run the API:

```bash
docker compose --env-file apps/server/.env up -d
pnpm --filter ./apps/server db:push
pnpm --filter ./apps/server dev
```

Alternatively, after changing to `apps/server`, use:

```bash
cd apps/server
docker compose --env-file .env -f ../../docker-compose.yml up -d
pnpm db:push
pnpm dev
```

Stop the local services from the repository root with `docker compose down`.

## Run the web app

The web app talks to the API through a proxy in `apps/web/next.config.ts`, so
start the API first (see above), then:

```bash
cp apps/web/.env.example apps/web/.env
pnpm --filter ./apps/web dev
```

Open [http://localhost:3001](http://localhost:3001). The home page shows
whether it can reach the API. Other useful scripts: `build`, `typecheck`, `lint`.

## View the database

After following the Getting started steps and applying the Prisma schema, run
Prisma Studio from the repository root:

```bash
pnpm --filter ./apps/server exec prisma studio
```

Open [http://localhost:5555](http://localhost:5555) to browse and edit the
PostgreSQL data, including users. Stop Prisma Studio with `Ctrl+C`.

Prisma Studio only shows PostgreSQL data. Redis is separate and stores
temporary auth data such as sessions and tokens.

## Environment files

Keep configuration in the app that uses it:

- Server secrets and settings belong in `apps/server/.env`. Use
  `apps/server/.env.example` as the template; never commit real credentials.
- When a web app is added, give it its own `.env` and `.env.example`. Only put
  values safe to expose to browsers in the web app's environment.
- A root `.env` is not needed unless root-level tooling or infrastructure later
  requires its own settings.

## Workspace dependencies

Add dependencies to the app or package that uses them. For example:

```bash
pnpm --filter ./apps/server add <package>
pnpm --filter ./apps/server add -D <package>
pnpm add -Dw <root-development-tool>
```

Run `pnpm install` from the root after changing workspace dependencies. The
repository uses one root `pnpm-lock.yaml`.
