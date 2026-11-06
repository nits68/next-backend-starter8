# AGENTS.md

Guidance for AI coding agents (Claude Code, GitHub Copilot, Cursor, Codex, etc.) working in this repository.

This is a **Next.js 16 REST API starter** (App Router route handlers, no UI) using **Prisma ORM 8** (release candidate) with **PostgreSQL**. It is a teaching template for students, so keep code simple, readable and consistent with the existing examples.

> **Prisma 8 is NOT Prisma 6/7.** Your training data mostly covers Prisma 6/7. Their APIs (`PrismaClient`, `prisma.film.findMany()`, `schema.prisma`, `prisma generate`, `@updatedAt`, `P2002` error codes) do **not** work here. Follow this file, `README.md` and `prisma-8.md`, not your memory of older Prisma versions.

## Stack and pinned versions

| Package                                  | Version          | Note                                       |
| ---------------------------------------- | ---------------- | ------------------------------------------ |
| `prisma` (CLI, devDependency)            | `8.0.0-rc.33`    | pinned, no `^`                             |
| `@prisma/orm-postgres` (runtime library) | `8.0.0-rc.23`    | pinned, no `^`                             |
| `@prisma/cli-engine`                     | `0.9.0`          | pinned, `prisma.config.ts` imports from it |
| `next` / `eslint-config-next`            | `16.4.4`         | pinned, must stay equal                    |
| Node.js                                  | 22.18+ or 24.11+ |                                            |

- **Do not change pinned versions**, add `^`, or run `npm audit fix --force` (it would downgrade `prisma` to v7 and break the project).
- Updating Prisma is a deliberate step: the `prisma` CLI and `@prisma/orm-postgres` must use the same internal `@prisma/orm-toolchain` version (check with `npm view <pkg>@<version> dependencies`). After updating, `npm ls @prisma/orm-framework` must show a single version. See README section 2.4.
- The remaining `npm audit` warnings come from dev tooling only; `npm audit --omit=dev` must report 0.

## Environment and commands

- **Windows: run commands in PowerShell**, not `cmd`. The Prisma 8 CLI fails (`CLI.CONFIG_UNREADABLE` / "Values and registries made by one copy…") when the working directory has a lowercase drive letter (`e:\…`), which `cmd` can produce.
- Use the npm scripts or `npx prisma …` (the CLI is a local devDependency, not global):

| Command                                                       | Purpose                                                                                        |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev`                                                 | dev server on http://localhost:3000                                                            |
| `npm run build`                                               | `prisma contract emit` + `next build`                                                          |
| `npm run contract:emit`                                       | regenerate `prisma/contract.json` + `contract.d.ts` from the contract                          |
| `npm run db:init`                                             | create tables on an empty database and sign it                                                 |
| `npm run db:update`                                           | apply contract changes directly (dev only, like Prisma 7 `db push`); `-- --dry-run` to preview |
| `npm run db:verify` / `npm run db:sign`                       | check / record that the database matches the contract                                          |
| `npm run db:seed`                                             | run `prisma/seed.ts` (**deletes and refills** all tables)                                      |
| `npm run db:setup`                                            | emit + init + seed                                                                             |
| `npm run db:infer1`                                           | existing database → contract (`contract infer`, **overwrites** `prisma/contract.prisma`)       |
| `npm run db:infer2`                                           | after reviewing the inferred contract: `contract emit` + `db sign` (does not change tables)    |
| `npm run migration:plan -- --name <name>` / `npm run migrate` | plan / apply a migration                                                                       |

## Secrets

- **Never read, print, modify or commit `.env`.** It holds real database passwords. Only `.env.example` (placeholders like `<JELSZÓ>`, `<SAJÁT-VÉGPONT>`) is committed.
- Never put connection strings, passwords or API keys into source files, docs, commit messages or terminal output.
- `DATABASE_URL` is used by the app; `DIRECT_URL` (if set) by the Prisma CLI (`prisma.config.ts`). On Neon both must be the direct (non `-pooler`) URL: since rc.23 the runtime sends the startup option `lc_monetary=C`, which the Neon pooler rejects (`unsupported startup parameter in options: lc_monetary`).

## Project layout

```
app/                    route handlers (route.ts), e.g. app/api/films/[id]/route.ts
prisma/contract.prisma  the data model (Prisma 8 "contract", replaces schema.prisma)
prisma/db.ts            the database client (import it, never create another client)
prisma/seed.ts          sample data
prisma/contract.json    GENERATED by `prisma contract emit` (gitignored) - do not edit
prisma/contract.d.ts    GENERATED by `prisma contract emit` (gitignored) - do not edit
migrations/             GENERATED by the Prisma CLI - do not hand-edit snapshots
prisma.config.ts        Prisma CLI config
.vscode/react-next.code-snippets  route handler snippets (íGETmany, íGETone, íPOST, íPATCH, íPUT, íDELETE)
```

## The contract (`prisma/contract.prisma`)

- The **first line must be `// use prisma-8`**, otherwise `contract emit` fails.
- **Format `prisma/contract.prisma` with the Prisma VS Code extension** (`Prisma.prisma`), not Prettier. `.vscode/settings.json` sets `"[prisma]": { "editor.defaultFormatter": "Prisma.prisma" }` with format on save. When you edit the contract, follow the extension's layout (aligned columns, one attribute block per line) so that the next format on save produces no diff.
- There is no `datasource` / `generator` block.
- Native PostgreSQL types go in the type position: `VarChar(200)`, `SmallInt`, `Numeric(8, 2)`, not `String @db.VarChar(200)`.
- Use `@@map("table_name")` and `@map("column_name")` for database names: tables are plural (`@@map("films")`), multi-word columns are snake_case (`createdAt ... @map("created_at")`, `authorId Int @map("author_id")`). Without `@map` the column would be camelCase and need double quotes in every hand-written SQL statement. Changing a `@map` on an existing database is NOT a rename for Prisma: `db update` drops and re-adds the column (data loss), so ask the user first; for this template drop the tables and run `npm run db:setup`.
- In raw SQL (`db.raw.sql`, e.g. the `TRUNCATE ... RESTART IDENTITY` in `prisma/seed.ts`) use the database names (`posts`, `author_id`), not the model/field names.
- **Dates: use the `JsDate` / `String` types or their convenience aliases.** This template uses `TimestamptzJsDate`. Since rc.22 `DateTime` (= `TimestamptzJsDate`, `timestamptz(3)`; `DateTime(precision: 6)` for `timestamptz`) and `Date` (= `DateString`) are convenience types that also work, and `contract infer` writes them. Never use the Temporal types (`TimestamptzTemporal`, `DateTemporal`, `DateTime(as: temporal)`): Node.js 24 has no global `Temporal` (`RUNTIME.TEMPORAL_UNAVAILABLE`). Bare `Timestamptz` / `Timestamp` no longer exist. Do not swap `TimestamptzJsDate` for plain `DateTime` on an existing database: the precision differs (6 vs 3).

```prisma
createdAt TimestamptzJsDate @default(now()) @map("created_at")
updatedAt TimestamptzJsDate @onCreate(now()) @onUpdate(now()) @map("updated_at")
```

Do not use `@updatedAt`, `temporal.updatedAtJsDate()` or `temporal.UpdatedAtJsDate` (removed in rc.22).

- Relations: `author User @relation(fields: [authorId], references: [id])` + `authorId Int`, and the back relation `posts Post[]`.
- Every model has `@@rls` (row-level security on, no policies). Keep it and add it to new models: Supabase enables RLS on new tables automatically, and without `@@rls` `db init` fails with `MIGRATION.PLANNING_FAILED ... Disable row-level security ... requires class "widening"`. The app connects as the table owner, so RLS does not affect it. Never disable RLS on Supabase (the tables would become readable/writable with the public anon key).
- After **every** contract change: `npm run contract:emit`, then `npm run db:update` (dev) or `migration:plan` + `migrate`.

## Database access (Prisma 8 query API)

Always import the shared client: `import db from "@/prisma/db";`. Models are accessed as `db.orm.public.<Model>`. Every terminal method must be **awaited**.

```ts
const films = await db.orm.public.Film.orderBy((f) => f.title.asc()).all();
const film = await db.orm.public.Film.where({ id }).first(); // null if not found
const page = await db.orm.public.Film.orderBy((f) => f.id.asc())
  .limit(10)
  .offset(20)
  .all();
const found = await db.orm.public.Film.where((f) => f.title.like("%egri%")).all();
const titles = await db.orm.public.Film.select("id", "title").all();
const users = await db.orm.public.User.include("posts").all();
const { total } = await db.orm.public.Film.aggregate((a) => ({ total: a.count() }));

const created = await db.orm.public.Film.create({ title, content }); // no `data:` wrapper
await db.orm.public.Film.createAll([
  { title: "A", content: "x" },
  { title: "B", content: "y" },
]);
const updated = await db.orm.public.Film.where({ id }).update({ content }); // null if not found
const deleted = await db.orm.public.Film.where({ id }).delete(); // null if not found
await db.orm.public.Film.where({ content: "x" }).updateAll({ content: "y" }); // returns the rows
await db.orm.public.Film.where({ content: "x" }).deleteAll(); // returns the rows
```

| Prisma 6/7 (do not use)                        | Prisma 8 (use)                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `prisma.film.findMany()`                       | `db.orm.public.Film.all()`                                                     |
| `findUnique` / `findFirst`                     | `.where({ ... }).first()`                                                      |
| `orderBy: { title: "asc" }`, `take`, `skip`    | `.orderBy((f) => f.title.asc())`, `.limit(n)`, `.offset(n)`                    |
| `create({ data })`                             | `.create({ ... })`                                                             |
| `update({ where, data })`, `delete({ where })` | `.where({ ... }).update({ ... })`, `.where({ ... }).delete()`                  |
| `include: { posts: true }`                     | `.include("posts")`                                                            |
| `count()`                                      | `.aggregate((a) => ({ total: a.count() }))`                                    |
| nested create (`posts: { create: [...] }`)     | not supported: create the parent first, then the children with the foreign key |

- `update` / `delete` **require** a preceding `.where(...)` and return `null` (no exception) when nothing matches.
- `VarChar(n)` fields are branded types; a plain `string` needs a cast: `import type { Varchar } from "@prisma/orm-postgres/target/codec-types";` then `value as Varchar<200>`.
- `Numeric` values come back as strings (e.g. `"3990.00"`).
- Do not create a new client per request and do not call `db.close()` in route handlers (only in scripts such as the seed).

## Error handling

Errors are PostgreSQL errors with a `sqlState` property (there are no `P2002`/`P2025` codes):

| `sqlState` | Meaning                                                                           | HTTP response                           |
| ---------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| `23505`    | unique constraint violation                                                       | `409`                                   |
| `23503`    | foreign key violation (missing referenced row, or row still referenced on delete) | `400` on create/update, `409` on delete |
| `22001`    | value too long for `VarChar(n)`                                                   | `400`                                   |

```ts
if (error instanceof Error && "sqlState" in error && error.sqlState === "23505") { ... }
```

## Route handler conventions

Follow the existing examples and the `.vscode/react-next.code-snippets`:

- `import { NextRequest, NextResponse } from "next/server";`
- Dynamic params are a Promise in Next.js 16: `{ params }: { params: Promise<{ id: string }> }`, `const id = Number((await params).id);`
- Invalid id (`Number.isNaN(id)`) → `400`; not found (`null`) → `404`; created → `201`; deleted → `204` with `new NextResponse(null, { status: 204 })`.
- Do not let the request body overwrite the primary key on update (`delete body.id`).
- User-facing messages are in **Hungarian** (e.g. `{ message: "Nincs ilyen rekord!" }`).
- Add a request to `tests.http` (VS Code REST Client) for new endpoints.

## Code style

- TypeScript, ES modules (`"type": "module"`), `@/` import alias for the project root.
- Prettier: double quotes, semicolons, trailing commas, 2 spaces, print width 100 (`.prisma` files: the Prisma extension, see above). ESLint: `eslint.config.mjs`.
- Keep comments short; the existing code comments are in Hungarian, match the surrounding style.

## Before finishing a change

Run (PowerShell) and make sure all pass:

```powershell
npm run contract:emit
npx tsc --noEmit
npx eslint .
npm run build
```

If the database schema changed, also run `npm run db:update -- --dry-run` and report the planned operations instead of applying destructive changes without asking.

## References

- `DATE-TIME.md` – date/time types: PostgreSQL ↔ Prisma 8 ↔ TypeScript ↔ JSON, time zones; note that `...JsDate` fields accept only `Date` objects (convert `request.json()` strings with `new Date(...)`)
- `README.md` – full setup guide (Hungarian): installation, databases (local PostgreSQL, Neon, Prisma Postgres, Supabase), troubleshooting (section 14)
- `prisma-8.md` – short Prisma 8 reference written by `prisma orm init`
- Prisma ORM 8 docs: https://www.prisma.io/docs/orm (append `.md` to any docs URL for Markdown)
- Coming from Prisma ORM 7: https://www.prisma.io/docs/orm/coming-from-prisma-orm-7
- Next.js route handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
