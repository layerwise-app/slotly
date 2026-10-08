# Layerwise project

<a href="https://layerwise.app"><img src="https://layerwise.app/powered-by.png" alt="Powered by Layerwise" width="320" /></a>

This is the starter used for new Layerwise projects. It is a full-stack React
app built with TanStack Start and deployed to Cloudflare Workers. The template
includes Better Auth, a D1 database with Drizzle ORM, Tailwind CSS, shadcn/ui,
and the Layerwise preview bridge.

## Commands

```bash
pnpm dev
pnpm check-types
pnpm build
pnpm auth:generate
pnpm db:generate --name <migration_name>
pnpm db:migrate
pnpm cf-typegen
pnpm release
```

`db:migrate` applies generated Drizzle migrations to the local D1 database.
Layerwise applies the same migrations to the project's production D1 database
during publishing.

## Important files

- `src/routes/`: TanStack Router file routes
- `src/lib/auth.ts`: Better Auth server configuration
- `src/lib/auth.functions.ts`: client-callable server functions
- `src/db/schema.ts`: Drizzle schema
- `vite.config.ts`: Cloudflare, TanStack Start, React, Tailwind, and Layerwise
  plugins
- `wrangler.jsonc`: local Worker and D1 bindings

Keep secrets server-side. Variables prefixed with `VITE_` are included in the
browser bundle. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `AUTH_EMAIL_URL`
belong in the Worker environment.
