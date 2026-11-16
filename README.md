# Instrimate

Instrimate is a pnpm monorepo. Applications live in `apps/`, and reusable
workspace packages live in `packages/`.

## Repository structure

```text
apps/
  server/       Express API
  web/          Planned web app
  mobile/       Planned mobile app
packages/
  shared/       Shared code, when needed by multiple apps
```

Only `apps/server` exists today. The workspace patterns in
`pnpm-workspace.yaml` automatically include future apps under `apps/` and
packages under `packages/`.

## Prerequisites

- Node.js 18 or newer
- pnpm (the version is pinned in the root `package.json`; Corepack can use it)
- Docker Compose

## Getting started

Run commands from the repository root unless noted otherwise:

```bash
corepack enable
pnpm install
docker compose up -d
cp apps/server/.env.example apps/server/.env
```

Edit `apps/server/.env` with your local MongoDB connection string and any
required secrets, then start the API:

```bash
pnpm --filter ./apps/server dev
```

Or run it from the server directory:

```bash
cd apps/server
pnpm dev
```

The server expects MongoDB and Redis; `docker compose up -d` starts local
instances.

Stop the local services with `docker compose down`.

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
