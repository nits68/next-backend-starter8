# Next.js-TS-Prisma 8-PostgreSQL REST API starter

- https://www.prisma.io/docs/prisma-orm/from-scratch
- https://www.prisma.io/docs/prisma-orm/add-to-existing-project/postgresql
- https://www.prisma.io/docs/orm/coming-from-prisma-orm-7

Két környezetre készül:

- **Vizsga:** helyi, localhost-ra telepített PostgreSQL szerver (lásd 6.1, 6.2)
- **Órai munka, házi feladat:** [Neon](https://neon.com) ingyenes felhős PostgreSQL (lásd 6.3)

A kód mindkét esetben ugyanaz, csak a `.env` állományban lévő connection string különbözik.

> [!IMPORTANT]
> **A Prisma 8 jelenleg release candidate.** 2026 szeptemberében `prisma@8.0.0-rc.17` (parancssori eszköz) és `@prisma/orm-postgres@8.0.0-rc.12` (könyvtár), a végleges kiadás 2026 októberére várható. A PostgreSQL-támogatás a legérettebb része, de a végleges kiadásig az API kis mértékben még változhat.
>
> Követelmények:
>
> - **Node.js 22.18+** (a 24-es ágon **24.11+**, a 24.0–24.10 nem jó), ajánlott a Node.js 24
> - **TypeScript 5.9+** (a `create-next-app` jelenleg 5.9.x-et telepít)
> - **PostgreSQL 15+** (a 18.x ajánlott)
> - `"type": "module"` a `package.json`-ban (az `orm init` beállítja)
> - Windowson a telepítést és a Prisma parancsokat **PowerShell** terminálból futtasd (lásd 2.1)

## 0. Mi változott a Prisma 7-hez képest?

A Prisma 8 egy teljesen újraírt, tisztán TypeScript alapú ORM. A séma helyett **contract** van, a generált kliens helyett a contractból **emitált** fájlokat használjuk, és új, láncolt lekérdező API-t kapunk.

| Prisma 7                                                   | Prisma 8                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `prisma` + `@prisma/client` + `@prisma/adapter-pg` + `pg`  | `prisma` (CLI) + `@prisma/orm-postgres` (könyvtár, a `pg` drivert is hozza)              |
| `npx prisma init`                                          | `npx prisma@latest orm init --target postgres`                                           |
| `prisma/schema.prisma`                                     | `prisma/contract.prisma`, első sora kötelezően: `// use prisma-8`                        |
| `generator` és `datasource` blokk                          | nincs, a kapcsolat a `prisma.config.ts`-ben van                                          |
| `prisma generate` (→ `lib/generated/prisma`)               | `prisma contract emit` (→ `prisma/contract.json` + `prisma/contract.d.ts`)               |
| `prisma migrate dev --name x`                              | `prisma migration plan --name x` + `prisma db migrate --advance-ref db`                  |
| `prisma db push`                                           | `prisma db init` (üres adatbázisra), `prisma db update`                                  |
| `prisma db pull`                                           | `prisma contract infer`                                                                  |
| `prisma migrate deploy`                                    | `prisma db migrate`                                                                      |
| shadow adatbázis kell a migrációhoz                        | nem kell, a `migration plan` az adatbázishoz sem csatlakozik                             |
| `@db.VarChar(200)`, `@db.SmallInt`                         | a típus helyén: `VarChar(200)`, `SmallInt`                                               |
| `DateTime @default(now())`, `DateTime @updatedAt`          | `TimestamptzJsDate @default(now())`, `temporal.updatedAtJsDate()` (JavaScript `Date`)    |
| `prisma.film.findMany()`                                   | `db.orm.public.Film.all()`                                                               |
| hibakód: `P2002`, `P2025`                                  | PostgreSQL `sqlState`: `23505`; nem létező rekordnál az `update`/`delete` `null`-t ad     |
| `prisma studio`                                            | nincs a Prisma 8 CLI-ben, a Prisma 7-esből indítható (lásd 13. pont)                     |

**Miért jövőbiztos?** A Prisma 8 a Prisma fejlesztésének iránya. A Prisma 7 a Prisma 8 végleges kiadása után még 18 hónapig kap javításokat, utána nem. A contract egyetlen, jól olvasható fájl, a migrációk TypeScript fájlok, amelyeket el is lehet olvasni és szerkeszteni.

## 1. Projekt inicializálása a create-next-app sablonnal

Kérdések nélkül, minden beállítással együtt:

> npx create-next-app@latest next-backend-starter8 --api --ts --eslint --app --no-tailwind --no-src-dir --no-react-compiler --no-agents-md --import-alias "@/\*" --use-npm<br>
> cd next-backend-starter8<br>

A kapcsolók:

| Kapcsoló                  | Jelentése                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `--api`                   | csak API (App Router route handlerek), felhasználói felület nélkül                 |
| `--ts`                    | TypeScript                                                                         |
| `--eslint`                | ESLint                                                                             |
| `--app`                   | app router-t használ                                                               |
| `--no-tailwind`           | Tailwind CSS nélkül (API-hoz nem kell)                                             |
| `--no-src-dir`            | nincs `src` mappa, az `app` a projekt gyökerében van                               |
| `--no-react-compiler`     | React Compiler nélkül                                                              |
| `--no-agents-md`          | nem hozza létre az AI-kódolóügynököknek szóló `AGENTS.md` és `CLAUDE.md` fájlokat  |
| `--import-alias "@/*"`    | az `@/` előtag a projekt gyökerére mutat (pl. `@/prisma/db`)                       |
| `--use-npm`               | npm csomagkezelő                                                                   |

A Next.js 16-ban a Turbopack az alapértelmezés, erre már nincs kérdés. Az `--api` sablon ESLint konfigurációs fájlt nem hoz létre, azt a 4. pontban pótoljuk.

## 2. További külső csomagok telepítése, Prisma inicializálása

### 2.1 PowerShell terminál használata (Windows)

A telepítést és a Prisma parancsokat Windowson **PowerShell** terminálból futtasd (a VS Code beépített terminálja alapból PowerShell). A Prisma 8 CLI (release candidate) ugyanis hibát ad, ha a parancssor kisbetűs meghajtójellel áll a projekt mappájában:

```
✘ [CLI.CONFIG_UNREADABLE] e:\...\prisma.config.ts could not be evaluated: config loading resolved E:/.../prisma.config.ts instead of e:\...\prisma.config.ts
```

A parancssorban (`cmd`) ez akkor fordul elő, ha a mappába kisbetűvel lépsz be (`cd /d e:\...`). A PowerShell a meghajtójelet mindig nagybetűsen adja át a programoknak (`cd e:\...` után is `E:\...`), így ott a hiba nem jön elő, bármelyik meghajtón (`C:`, `D:`, `E:` …) van a projekt.

### 2.2 A projekt csomagjai és a Prisma inicializálása

> npm i -D prettier typescript-eslint tsx<br>
> npx prisma@latest orm init --yes --target postgres --authoring psl --schema-path prisma/contract.prisma --write-env<br>
> npm install-scripts deny esbuild unrs-resolver workerd<br>

A csomagok:

- `prettier`: kódformázó (a VS Code Prettier bővítménye ezt használja)
- `typescript-eslint`: az ESLint TypeScript szabályai. Az `eslint.config.mjs` által használt `@eslint/js` csomagot nem kell külön telepíteni, mert az ESLint (a `create-next-app` a 9-es verziót telepíti) a hozzá illő verziót magával hozza. Verziószám nélkül ne is telepítsd: az `@eslint/js` legújabb verziója a 10-es, amely ESLint 10-et igényel, ezért `ERESOLVE` hibát ad.
- `tsx`: TypeScript scriptek (pl. seed) futtatása fordítás nélkül

Az `orm init` kapcsolói:

- `--yes`: nem kérdez
- `--target postgres`: PostgreSQL adatbázis
- `--authoring psl`: a contract a megszokott Prisma sémanyelven (PSL) készül (a másik lehetőség a `typescript`)
- `--schema-path prisma/contract.prisma`: a contract helye (alapértelmezés: `src/prisma/contract.prisma`)
- `--write-env`: a `.env.example` alapján a `.env` állományt is létrehozza

Az `orm init` a következőket végzi el:

- telepíti a `@prisma/orm-postgres` és a `dotenv` csomagokat, fejlesztői függőségként a `prisma` és a `@prisma/cli-engine` csomagokat
- létrehozza a `prisma.config.ts`, a `prisma/contract.prisma` (minta `User` és `Post` modellel), a `prisma/db.ts` és a `prisma-8.md` (rövid Prisma 8 összefoglaló) állományokat
- a `package.json`-ba felveszi a `"type": "module"` beállítást és a `contract:emit` scriptet
- a `tsconfig.json`-ban beállítja a `"module": "preserve"` és a `"types": ["node"]` opciókat (a Next.js-nek ez megfelel)
- kiegészíti a `.gitignore`-t, létrehozza a `.gitattributes`-t (a generált fájlok jelölésére)
- a contractból legenerálja a `prisma/contract.json` és a `prisma/contract.d.ts` állományokat

A `prisma` CLI a projekt fejlesztői függősége, ezért a parancsokat `npx prisma ...` alakban (vagy a `package.json` scriptjeivel, `npm run ...`) kell futtatni, internet nélkül is működnek. A VS Code Prisma bővítménye is a projekt `node_modules/prisma` mappájából indítja a Prisma 8 nyelvi szerverét (IntelliSense, formázás, hibajelzés a `contract.prisma`-ban).

A Prisma 8 CLI magával hozza a Prisma felhős alkalmazás-telepítő eszközét (Prisma Composer) is, ezért a `node_modules` mappa kb. 135 000 fájlból áll (a Prisma 7-nél kb. 30 000 volt). A futó alkalmazás ebből semmit nem használ, csak az `@prisma/orm-postgres` könyvtárat.

**Ellenőrzés:** a `prisma` mappában legyen ott a `contract.json` és a `contract.d.ts`. Ha hiányoznak, a `prisma/db.ts` importjai hibát jeleznek (`Cannot find module './contract.d'`, `Cannot find module './contract.json'`). Ilyenkor futtasd le:

> npx prisma contract emit<br>

### 2.3 Telepítési figyelmeztetések (allowScripts)

Az npm 11 minden telepítésnél figyelmeztet azokra a csomagokra, amelyek telepítéskor scriptet futtatnának, de nincs róluk döntés:

```
npm warn allow-scripts 3 packages have install scripts not yet covered by allowScripts:
npm warn allow-scripts   esbuild@0.28.2 (postinstall: node install.js)
npm warn allow-scripts   unrs-resolver@1.12.2 (postinstall: node postinstall.js)
npm warn allow-scripts   workerd@1.20260901.1 (postinstall: node install.js)
```

A 2.2 pont utolsó parancsa (`npm install-scripts deny esbuild unrs-resolver workerd`) erről dönt: letiltja a scriptek futtatását, és a döntést a `package.json`-ba írja, így a figyelmeztetés többet nem jelenik meg:

```json
"allowScripts": {
  "esbuild": false,
  "unrs-resolver": false,
  "workerd": false
}
```

Egyik script sem kell a működéshez: az `esbuild` (ezt a `tsx` használja) és az `unrs-resolver` (ezt az `eslint-config-next` használja) a platformnak megfelelő binárisát külön csomagként kapja meg, a script csak ellenőrzi. A `workerd` (Cloudflare futtatókörnyezet) a Prisma CLI felhős telepítő részéhez (Prisma Composer) kell, a `contract emit`, `db ...` és `migration ...` parancsok nem használják. Kipróbálva: a `tsx`, az ESLint és a `next build` a letiltás után is működik. A függőben lévő csomagok listája: `npm install-scripts ls`. Ha később új csomag kerül a listára, ugyanígy dönthetsz róla (`approve` = engedélyez, `deny` = letilt).

## 3. Prisma konfigurálása: ./prisma.config.ts

A Prisma 8-ban nincs `datasource` és `generator` blokk. Az adatbázis típusát a `@prisma/orm-postgres/config` import, a kapcsolatot a `db.connection` határozza meg. Az `orm init` által létrehozott állományt cseréld le erre (a `DIRECT_URL` a Neonhoz kell, lásd 6.3; ha nincs megadva, a `DATABASE_URL`-t használja):

```ts
import "dotenv/config";
import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./prisma/contract.prisma",
    db: {
      // a CLI (migrációk) a direkt kapcsolatot használja, ha van ilyen (Neon)
      connection: (process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"])!,
    },
  }),
  skills: {
    check: false, // ne jelezzen minden parancsnál az AI-ügynököknek szóló skill fájlok miatt
  },
});
```

A `definePrismaConfig` az `orm init` által írt `@prisma/cli-engine` csomagból jön (a `prisma/config` import is működik, a kettő ugyanaz). A `prisma.config.ts` csak a Prisma CLI-nek szól (`contract emit`, `db ...`, `migration ...`), a futó Next.js alkalmazás nem olvassa.

> [!WARNING]
> Egy projekthez egy `prisma.config.ts` és egy `migrations` mappa tartozzon. A CLI a konfigurációs fájl mappájában lévő `migrations` mappát használja, és a szülőmappák `prisma.config.ts` állományait is beolvassa. Ha egy mappába két projektet teszel, a migrációik és a `db` hivatkozásuk (`migrations/app/refs/db.json`) összekeveredik.

## 4. Konfigurációs állományok létrehozása, vagy másolása

.vscode/extensions.json (majd a VS Code indításakor a felajánlott bővítmények telepítése)

```json
{
    "recommendations": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "prisma.prisma",
        "humao.rest-client",
        "ms-ossdata.vscode-pgsql",
        "usernamehw.errorlens",
        "abdulowhab.json-to-ts-type",
        "yoavbls.pretty-ts-errors",
        "humao.rest-client"
    ]
}
```

A Prisma VS Code bővítmény csak azokat a `.prisma` állományokat kezeli Prisma 8 contractként (hibajelzés, formázás, kódkiegészítés), amelyeknek az első sora `// use prisma-8`.

.vscode/settings.json

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.mouseWheelZoom": true,
  "editor.wordWrap": "on",
  "editor.minimap.enabled": false,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always"
  },
  "eslint.validate": ["typescript", "react", "typescriptreact", "javascript", "javascriptreact"],
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "git.enableSmartCommit": true,
  "git.confirmSync": false,
  "git.pruneOnFetch": true,
  "git.autofetch": true,
  "git.autofetchPeriod": 60,
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  },
  "[json]": {
    "editor.defaultFormatter": "vscode.json-language-features"
  },
  "js/ts.preferences.importModuleSpecifier": "non-relative"
}
```

.vscode/tasks.json

```jsonc
{
  // See https://go.microsoft.com/fwlink/?LinkId=733558
  // for the documentation about the tasks.json format
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "dev",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "type": "npm",
      "script": "test",
      "group": {
        "kind": "test",
        "isDefault": true
      }
    }
  ]
}
```

.vscode/launch.json (hibakeresés: töréspontok a route handlerekben és a seed scriptben)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev -- --inspect",
      "resolveSourceMapLocations": [
        "${workspaceFolder}/**",
        "!**/node_modules/**",
        "!**/.next/dev/server/chunks/turbopack*/**"
      ]
    },
    {
      "name": "Debug seed",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run db:seed"
    }
  ]
}
```

Használat: töréspont elhelyezése (F9), majd **Run and Debug** panel (Ctrl+Shift+D) → konfiguráció kiválasztása → F5.

- **Debug server-side:** a `--inspect` a `next dev` kapcsolója, ezzel a Next.js a szerverkódot (route handlereket) futtató folyamatot debug módban indítja. A törésponton a futás a végpont meghívásakor áll meg (pl. a `tests.http`-ből).
- **`resolveSourceMapLocations`:** megadja, mely fájlokhoz keressen a debugger source mapet: csak a projekten belül, a `node_modules` és a Turbopack belső fájljai nélkül. A harmadik sor nélkül a Debug Console-ban ez a (ártalmatlan) figyelmeztetés jelenik meg: `Could not read source map for file:///.../.next/dev/server/chunks/turbopack%3A/%5Bturbopack%5D/nodejs/dev/hmr-client.ts: Unexpected token ... is not valid JSON`. Ez a Next.js belső, automatikus újratöltést végző kódja, amelyhez nincs olvasható source map. A saját route handlerek lefordított kódja a `.next/dev/server/chunks/ssr/...` alatt van, ezt a kizárás nem érinti, a töréspontok működnek.
- **Debug seed:** a `prisma/seed.ts` hibakeresése. Ide nem kell `--inspect`, mert a `node-terminal` típusnál a VS Code debuggere magától rácsatlakozik a terminálban induló Node-folyamatra. A seed debug módban is törli és újratölti a táblákat.

tsconfig.json: a generált migrációs fájlokat (`migrations` mappa) ki kell zárni a TypeScript ellenőrzésből, különben egy kézzel kiegészítendő migráció a `next build`-et is megállítja. A fájl végén:

```json
  "exclude": ["node_modules", "migrations"]
```

eslint.config.mjs (a generált Prisma állományokat ki kell hagyni)

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended, // Alap JavaScript ajánlott szabályok
  ...tseslint.configs.recommended, // TypeScript ajánlott szabályok

  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**",
      "next-env.d.ts",
      "prisma/contract.d.ts", // generált állomány
      "migrations/**", // generált migrációk és snapshotok
      "*.config.js",
      "*.config.cjs",
      "*.config.mjs",
    ],
  },

  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      // TypeScript best practices
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-explicit-any": "off",

      // Kód tisztaság
      "no-console": "warn",
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: "error",
    },
  },
];
```

prettier.config.ts

```ts
import { type Config } from "prettier";

const config: Config = {
  singleQuote: false,
  semi: true,
  trailingComma: "all",
  tabWidth: 2,
  printWidth: 100,
};

export default config;
```

.prettierignore

```
.next
node_modules
prisma/contract.json
prisma/contract.d.ts
migrations
```

Ellenőrzés: `npx eslint .` és `npx prettier --check .`

## 5. package.json scriptek, prisma/db.ts

A `package.json` scriptjei:

```json
"scripts": {
  "dev": "next dev -p 3000",
  "build": "prisma contract emit && next build",
  "start": "next start",
  "postinstall": "prisma contract emit",
  "contract:emit": "prisma contract emit",
  "db:init": "prisma db init",
  "db:update": "prisma db update",
  "db:verify": "prisma db verify",
  "db:sign": "prisma db sign",
  "db:seed": "tsx prisma/seed.ts",
  "migration:plan": "prisma migration plan",
  "migration:status": "prisma migration status",
  "migrate": "prisma db migrate --advance-ref db"
}
```

A Prisma parancsok a scriptekkel is futtathatók, paraméterek a `--` után adhatók át, pl.:

```powershell
npm run migration:plan -- --name uj_mezo
npm run db:update -- --dry-run
```

A `contract emit`-hez nem kell adatbázis-kapcsolat, ezért a build előtt is futtatható. A generált `prisma/contract.json` és `prisma/contract.d.ts` állományokat nem kell commitolni: klónozás után az `npm install` (a `postinstall` scripttel), a `next build` előtt pedig a `build` script újra előállítja őket. A `.gitignore` végére:

```
# prisma 8 (a "prisma contract emit" generálja, az npm install postinstall scriptje is)
/prisma/contract.json
/prisma/contract.d.ts
```

Ha már commitoltad őket, a gitből így vehetők ki (a lemezen megmaradnak): `git rm --cached prisma/contract.json prisma/contract.d.ts`.

./prisma/db.ts (az `orm init` létrehozta; egészítsd ki, hogy a Next.js hot reload miatt egyetlen kliens példány legyen):

```ts
import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

const createDb = () => postgres<Contract>({ contractJson, url: process.env["DATABASE_URL"]! });

// egyetlen kliens példány a Next.js hot reload miatt
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };
export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export default db;
```

- A kliens az első lekérdezéskor csatlakozik, a kapcsolatot a `db.close()` zárja le (Next.js-ben erre nincs szükség, csak scripteknél).
- A kódban: `import db from "@/prisma/db";`

## 6. PostgreSQL szerver és a .env beállítása

### 6.1 Telepített PostgreSQL szerver

Telepítő: [PostgreSQL for Windows (EDB)](https://www.postgresql.org/download/windows/) → **Download the installer**. Alapértelmezések: port `5432`, felhasználó `postgres`, a jelszót a telepítéskor kell megadni. A telepítő a **pgAdmin 4** adatbázis-kezelőt is felteszi.

#### 6.1.1 A szerver indítása csak parancsra

A telepítő a szervert Windows-szolgáltatásként teszi fel, amely minden rendszerindításkor automatikusan elindul. Ha csak akkor szeretnéd futtatni, amikor dolgozol vele, egyszer állítsd át kézi indításra. **Rendszergazdai** PowerShellben:

```powershell
Get-Service postgresql*
```

A parancs kiírja a szolgáltatás pontos nevét (PostgreSQL 18 esetén várhatóan `postgresql-x64-18`). Kézi indítás beállítása és a futó szerver leállítása:

```powershell
Set-Service -Name postgresql-x64-18 -StartupType Manual
Stop-Service postgresql-x64-18
```

Ezután a szerver csak parancsra indul és áll le (rendszergazdai PowerShellben):

```powershell
Start-Service postgresql-x64-18
Stop-Service postgresql-x64-18
```

Rendszergazdai parancssorban (cmd) ugyanez: `net start postgresql-x64-18`, illetve `net stop postgresql-x64-18`.

#### 6.1.2 Az adatbázis létrehozása és a .env

A Prisma 8 az adatbázist nem hozza létre, azt előre el kell készíteni (pgAdminban: **Databases → Create → Database…**, vagy psql-lel):

```powershell
psql -h localhost -U postgres -c "CREATE DATABASE filmekdb;"
```

Az adatbázis neve **kisbetűs** legyen: a PostgreSQL az idézőjel nélküli neveket kisbetűsre alakítja (`CREATE DATABASE filmekDB` → `filmekdb`), a connection stringben viszont pontosan egyeznie kell.

.env

```
DATABASE_URL="postgresql://postgres:jelszo@localhost:5432/filmekdb"
```

A jelszóban lévő speciális karaktereket (`@`, `:`, `/`, `#`, `%` stb.) URL-kódolni kell (pl. `@` → `%40`).

### 6.2 Helyi PostgreSQL telepítés nélkül (PostgreSQL zip binárisok)

Hordozható, "igazi" PostgreSQL szerver, Windows-szolgáltatás nélkül: a szerver csak akkor fut, amikor elindítod, és rendszergazdai jog sem kell hozzá. Ugyanúgy működik, mint a MongoDB-s változatban a `startMongoDB.bat` + `c:\data\db`.

**Letöltés:**

1. Nyisd meg az EDB oldalát: [https://www.enterprisedb.com/download-postgresql-binaries](https://www.enterprisedb.com/download-postgresql-binaries)
2. A **Binaries from installer Version 18.x** sorban kattints a **Windows x86-64** ikonra.
3. Letöltődik a `postgresql-18.x-x-windows-x64-binaries.zip` állomány (2026 szeptemberében: `postgresql-18.6-4-windows-x64-binaries.zip`, kb. 365 MB).

**Kicsomagolás:** a zip egy `pgsql` mappát tartalmaz, ezt csomagold ki a `c:\` gyökerébe, így a programok a `c:\pgsql\bin` mappába kerülnek. A csomagban a **pgAdmin 4** is benne van (`c:\pgsql\pgAdmin 4\runtime\pgAdmin4.exe`). Ha induláskor hiányzó DLL-re (pl. `VCRUNTIME140.dll`) panaszkodik, telepíteni kell a [Microsoft Visual C++ Redistributable (x64)](https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist) csomagot.

**Az adatkönyvtár létrehozása** (csak egyszer kell; a `-W` kapcsoló bekéri a `postgres` felhasználó jelszavát):

./data/initPostgres.bat

```bat
if not exist "c:\pgdata\" c:\pgsql\bin\initdb.exe -D c:\pgdata -U postgres -W -E UTF8 -A scram-sha-256
pause
```

**Indítás, állapot és leállítás:**

./data/startPostgres.bat

```bat
c:\pgsql\bin\pg_ctl.exe -D c:\pgdata -l c:\pgdata\postgres.log start
```

./data/statusPostgres.bat

```bat
c:\pgsql\bin\pg_ctl.exe -D c:\pgdata status
pause
```

./data/stopPostgres.bat

```bat
c:\pgsql\bin\pg_ctl.exe -D c:\pgdata stop
```

**Az adatbázis létrehozása** (a szerver elindítása után):

```powershell
c:\pgsql\bin\psql.exe -h localhost -U postgres -c "CREATE DATABASE filmekdb;"
```

A `.env` ugyanaz, mint a 6.1.2 pontban (port `5432`).

Ha ugyanazon a gépen a telepített (6.1) PostgreSQL szolgáltatás is fut, a kettő ütközik az 5432-es porton. Ilyenkor a szolgáltatást állítsd le, vagy a zip-es szervert más porton indítsd: `pg_ctl ... -o "-p 5433" start` (és a `.env`-ben is `5433` legyen).

### 6.3 Neon (órai munka, házi feladat)

1. Regisztráció a [neon.com](https://neon.com) oldalon (GitHub vagy Google fiókkal is lehet), majd új projekt létrehozása (régió: pl. `AWS Europe Central (Frankfurt)`). A Neon a `neondb` adatbázist automatikusan létrehozza.
2. A projekt **Dashboard** oldalán a **Connect** gombbal nyílik meg a connection string. A **Connection pooling** kapcsolóval a pooled (a hosztnévben `-pooler` szerepel) és a direkt változat között lehet váltani.
3. A `.env`-be mindkettő kerüljön: a program a pooled kapcsolatot használja (`DATABASE_URL`), a Prisma CLI (migrációk, `contract infer`) a direkt kapcsolatot (`DIRECT_URL`):

```
# --- Helyi PostgreSQL (vizsga) ---
# DATABASE_URL="postgresql://postgres:jelszo@localhost:5432/filmekdb"

# --- Neon ---
DATABASE_URL="postgresql://neondb_owner:<JELSZÓ>@<SAJÁT-VÉGPONT>-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:<JELSZÓ>@<SAJÁT-VÉGPONT>.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
```

- A `<JELSZÓ>` és a `<SAJÁT-VÉGPONT>` helyére a Neon **Connect** ablakából másolt értékek kerülnek. A végpont neve `ep-`-vel kezdődik (pl. `ep-rapid-shape-b1h8o5g5`), a régió része (`c-5.eu-central-1`) is projektenként eltérhet. Ha a helyőrző benne marad, a Neon félrevezető módon `password authentication failed` hibát ad.
- A két URL-ben **csak a hostnév `-pooler` része különbözik**, minden más egyezzen, az adatbázis neve (`/neondb`) is. Ha a `/neondb` kimarad, a hiba: `database "neondb_owner" does not exist` (a `pg` driver ilyenkor a felhasználónevet használja adatbázisnévként).
- A Neon által adott URL-ekben `sslmode=require` áll. A `verify-full` értékkel eltűnik a `pg` driver `SECURITY WARNING` figyelmeztetése (a biztonság nem változik, a `pg` a `require`-t eddig is így kezelte). A Prisma 8 CLI is a `pg` drivert használja, ezért a `DIRECT_URL`-ben is írható. Ha ott mégis gondot okozna, a `require` is működik (csak a figyelmeztetés jelenik meg).
- A tétlenség miatt leállt Neon adatbázis újraindulása néhány másodpercig tart, ez külön beállítás nélkül is belefér: a Prisma 8 CLI (`pg` driver) alapból időkorlát nélkül, a program kliense 20 másodpercig vár a kapcsolatra. A Prisma 7-nél használt `connect_timeout` URL-paramétert a Prisma 8 nem veszi figyelembe, ezért nem kell (ha benne marad, nem árt).
- A két környezet között mindig a **teljes blokkot** kommentezd ki/be. Ha a `DIRECT_URL` a Neonra, a `DATABASE_URL` a helyi szerverre mutat, a migrációk a Neonra, a program a helyi adatbázisra kerül. Üres `DIRECT_URL=""` sor se maradjon, mert azt a config nem cseréli le a `DATABASE_URL`-re.

A Neon ingyenes csomagja (2026. szeptember): 100 projekt, projektenként 0,5 GB tárhely és havi 100 CU-óra számítási idő. Az adatbázis 5 perc tétlenség után leáll, és az első kérésre újraindul. A projekt nem szünetel véglegesen, mint a Supabase ingyenes projektjei.

A migrációkat helyben érdemes elkészíteni, és a Neonra csak alkalmazni (lásd 9. pont).

### 6.4 További népszerű (ingyenes csomaggal is elérhető) PostgreSQL szolgáltatások

| Szolgáltató                                        | Ingyenes keret (2026. szeptember)          | Megjegyzés                                                                    |
| -------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| [Neon](https://neon.com)                           | 100 projekt, 0,5 GB/projekt                | nem szünetel, adatbázis-ágak (branching), a Vercel is ezt kínálja             |
| [Prisma Postgres](https://www.prisma.io/postgres)  | 50 adatbázis, 500 MB, havi 200 000 művelet | `npx create-db` egy ideiglenes adatbázist ad, a kiírt claim linkkel megtartható |
| [Supabase](https://supabase.com)                   | 2 aktív projekt, 500 MB                    | 1 hét tétlenség után szünetel, kézzel kell újraindítani                       |

Az árak és a korlátok gyakran változnak, a tanév elején érdemes ellenőrizni őket.

## 7. Prisma contract létrehozása (minta modellek) ./prisma/contract.prisma

Három minta modell: `User` és `Post` (egy-a-többhöz kapcsolattal: egy felhasználónak több bejegyzése lehet), valamint a kapcsolat nélküli `Film`. Az `orm init` a `User` és `Post` modellt szöveges dátumtípusokkal (`TimestamptzString`, `temporal.updatedAtString()`) hozza létre, ezeket írd át a `JsDate`-es típusokra, hogy mindhárom modellben egyformán `Date` objektumként kapd a dátumokat:

```prisma
// use prisma-8

model User {
  id        Int               @id @default(autoincrement())
  email     String            @unique
  username  String?
  name      String?
  posts     Post[]
  createdAt TimestamptzJsDate @default(now())
  updatedAt temporal.updatedAtJsDate()

  @@map("users")
}

model Post {
  id        Int               @id @default(autoincrement())
  title     String
  content   String?
  author    User              @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt TimestamptzJsDate @default(now())
  updatedAt temporal.updatedAtJsDate()

  @@map("posts")
}

model Film {
  id        Int               @id @default(autoincrement())
  title     String            @unique
  content   String
  createdAt TimestamptzJsDate @default(now())
  updatedAt temporal.updatedAtJsDate()

  @@map("filmek")
}
```

A kapcsolat:

- `Post.authorId` az idegen kulcs oszlop, a `Post.author` mező a `@relation(fields: [authorId], references: [id])` leírással mondja meg, hogy az `authorId` a `User.id`-re hivatkozik. Ebből az adatbázisban `FOREIGN KEY` lesz.
- `User.posts` a kapcsolat másik oldala (oszlop nincs mögötte), ezzel lehet egy felhasználó bejegyzéseit lekérdezni: `db.orm.public.User.include("posts").all()`.
- Nem létező `authorId`-vel nem hozható létre bejegyzés, és amíg egy felhasználónak van bejegyzése, a felhasználó nem törölhető (mindkettő `23503`-as hibát ad).

További tudnivalók:

- Az első sor (`// use prisma-8`) kötelező, nélküle a `contract emit` hibával leáll (`CONTRACT.SOURCE_LOAD_FAILED`).
- A natív PostgreSQL típusok a típus helyére kerülnek: `VarChar(200)`, `Char(2)`, `SmallInt`, `Numeric(8, 2)`, `Date`, `Uuid` stb.
- A `VarChar(n)`, `Char(n)` és `Numeric(p, s)` mezők TypeScript típusa nem sima `string`, hanem egy "megjelölt" típus (pl. `Varchar<200>`). Szöveges értéket csak típuskényszerítéssel lehet nekik átadni (lásd lent). Ha nincs szükség hosszkorlátra, egyszerűbb a `String` (`text` oszlop).
- A `@unique`-ból valódi `UNIQUE` megszorítás lesz az adatbázisban.
- A kódban a modellek elérése: `db.orm.public.User`, `db.orm.public.Post`, `db.orm.public.Film` (`public` a PostgreSQL séma neve).
- A `@@map("users")` a tábla nevét adja meg (a modell neve `User`, a táblaé `users`).

**Dátumtípusok.** A dátumokhoz a `JsDate` végű típusokat használjuk, ezek JavaScript `Date` objektumként érkeznek, a JSON válaszban pedig ISO dátumszövegként (pl. `"2026-09-27T15:15:29.257Z"`) jelennek meg:

| Contract típus                    | PostgreSQL oszlop | Mikor kap értéket?                                                   |
| --------------------------------- | ----------------- | -------------------------------------------------------------------- |
| `TimestamptzJsDate @default(now())` | `timestamptz`   | létrehozáskor, az adatbázis órája szerint                            |
| `temporal.createdAtJsDate()`      | `timestamptz`     | létrehozáskor, az alkalmazás órája szerint                           |
| `temporal.updatedAtJsDate()`      | `timestamptz`     | létrehozáskor és minden módosításkor, az alkalmazás órája szerint    |
| `TimestamptzJsDate?`              | `timestamptz`     | amikor megadod (opcionális dátum)                                    |
| `TimestamptzString`, `TimestampString` | `timestamptz`, `timestamp` | amikor megadod; a kódban szövegként (pl. `"2026-09-27 17:12:19"`) |

A `JsDate` és `String` nélküli dátumtípusok (`DateTime`, `Timestamptz`, `Timestamp`, `Date`, `temporal.updatedAt()`) a JavaScript új `Temporal` API-ját használják, amely csak a Node.js 26-tól beépített. Node.js 24-en az ilyen mezők olvasása `RUNTIME.TEMPORAL_UNAVAILABLE` hibával leáll, ezért ezeket ne használd.

**`VarChar` mezők írása.** Ha a modellben pl. `nev VarChar(100)` szerepel, egy `string` értékre a TypeScript ezt a hibát adja: `Type 'string' is not assignable to type 'Varchar<100>'`. Megoldás:

```ts
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

await db.orm.public.Rendezo.create({ nev: "Fábri Zoltán" as Varchar<100> });
```

A hossz ellenőrzését ez nem kapcsolja ki: a túl hosszú szöveget az adatbázis `22001`-es hibával (`value too long for type character varying(100)`) utasítja el. A `request.json()`-ból érkező értékeknél a hiba nem jön elő, mert azok típusa `any`.

majd (a szerver fusson, és az adatbázis létezzen, lásd 6. pont):

> npx prisma contract emit<br>
> npx prisma db init<br>

A `db init` üres adatbázison létrehozza a táblákat, majd "aláírja" az adatbázist: egy jelölőt (marker) ír bele, amelyből a Prisma tudja, melyik contract-verziónak felel meg. Emellett létrehozza a `migrations/app/refs/db.json` hivatkozást és a `migrations/snapshots` mappát, ezeket commitolni kell.

## 8. A contract a meglévő adatbázistáblákból is létrehozható

> npx prisma contract infer --output ./prisma/contract.prisma<br>

A parancs felülírja a megadott contractot. A Prisma 7-es `db pull`-hoz képest sokkal olvashatóbb eredményt ad:

- a modellek PascalCase nevet kapnak (`konyvek` tábla → `model Konyvek` + `@@map("konyvek")`),
- a mezők camelCase nevet (`szerzo_id` oszlop → `szerzoId` + `@map("szerzo_id")`),
- a `CHECK` megszorítások is bekerülnek (`@@check(...)`),
- az elsődleges kulcs nélküli táblákat `// WARNING: This table has no primary key in the database` megjegyzés jelzi (ilyenkor adj a táblának elsődleges kulcsot).

Átnézés után (modellnevek egyes számba: `Konyvek` → `Konyv`, a `@@map` maradjon!):

> npx prisma contract emit<br>
> npx prisma db sign<br>

A `db sign` ellenőrzi, hogy az adatbázis megfelel-e a contractnak, és aláírja (a táblák nem változnak). Ezután a migrációk a 9. pont szerint működnek.

Figyelj a típusokra, mielőtt emitálsz:

- A `timestamptz` oszlopok `Timestamptz` típust kapnak: írd át `TimestamptzJsDate`-re (az oszlop típusa ugyanaz marad).
- A `timestamp` oszlopok `Timestamp` típust kapnak: írd át `TimestampString`-re (az oszlop típusa ugyanaz marad, a kódban szövegként kapod), vagy alakítsd az oszlopot `timestamptz`-re.
- A `varchar` oszlopok `VarChar(n)` típust kapnak, ezekbe írni csak típuskényszerítéssel lehet (lásd 7. pont).
- A `Numeric` típusú mezők szövegként jönnek vissza (pl. `"3990.00"`).
- A `CHECK` megszorításoknál az emit `PN_EXACT_NAME_BODY_COMPARISON` figyelmeztetést írhat ki. Ez a `contract infer`-ből származó megszorításoknál nem okoz gondot.

## 9. Minden contract változás után szinkronizálás az adatbázissal

Migrációval (ajánlott; a migrációk a `migrations/app` mappába kerülnek, ezeket commitolni kell):

> npx prisma contract emit<br>
> npx prisma migration plan --name valtozas_neve<br>
> npx prisma db migrate --advance-ref db<br>

- A `migration plan` a contract előző és új változata közötti különbségből készíti el a migrációt, az adatbázishoz nem csatlakozik (shadow adatbázis sem kell). Kiírja a futtatandó SQL-t is.
- Az első `migration plan` egy `baseline` migrációt is készít, amely a `db init` utáni állapotot rögzíti.
- A `--advance-ref db` azt jegyzi fel, hogy a fejlesztői adatbázis már az új állapotban van, így a következő `migration plan` innen indul.
- Egy meglévő oszlop **típusának** megváltoztatásakor (pl. `VarChar(200)` → `String`) a Prisma az adatok átalakítására egy kézzel kitöltendő lépést (`placeholder(...)`) generál a `migration.ts`-be. Ilyenkor a migrációt ki kell egészíteni, vagy (fejlesztés közben) a `prisma db update` parancsot kell használni.

Állapot és ellenőrzés:

> npx prisma migration status<br>
> npx prisma db verify<br>

Gyors kísérletezéshez migráció nélkül (a Prisma 7-es `db push` megfelelője, lásd 10. pont):

> npx prisma contract emit<br>
> npx prisma db update<br>

A kész migrációk alkalmazása egy másik adatbázisra (pl. Neonra, az aktív Neon `.env` blokkal): előbb nézd meg, mi fog lefutni, aztán futtasd, **`--advance-ref` nélkül**:

> npx prisma db migrate --show<br>
> npx prisma db migrate<br>

## 10. contract emit, db update, db sign – mikor melyiket?

Ez a három parancs a leggyakoribb, és könnyű összekeverni őket. Röviden: az **emit** a fájlokat frissíti, az **update** az adatbázist igazítja a contracthoz, a **sign** az adatbázison semmit nem változtat, csak rögzíti, hogy megfelel a contractnak.

| Parancs                | Mit csinál?                                                                                             | Kell hozzá adatbázis? | Módosítja az adatbázist?                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------- |
| `prisma contract emit` | a `contract.prisma`-ból elkészíti a `contract.json` és `contract.d.ts` fájlt (a kód és a TypeScript ezeket használja) | nem                   | nem                                       |
| `prisma db update`     | összeveti az adatbázist a contracttal, a különbséget végrehajtja (tábla, oszlop, index létrehozása, törlése), majd aláírja | igen                  | **igen** (adatvesztés előtt megerősítést kér) |
| `prisma db sign`       | ellenőrzi, hogy az adatbázis megfelel-e a contractnak; ha igen, aláírja (a jelölőt frissíti)             | igen                  | nem (csak a jelölőt írja)                 |

### prisma contract emit

**Mindig**, amikor a `contract.prisma` változik, minden más parancs előtt. A `db update`, a `db sign`, a `db init` és a `migration plan` is az emitált `contract.json`-ból dolgozik, nem a `contract.prisma`-ból. Ha elmarad:

- a kód és a TypeScript a régi modelleket látja (hiányzó mezők, `Cannot find module './contract.json'`),
- a `db update` / `db sign` a régi contracthoz igazít vagy ellenőriz.

Tipikus esetek: új modell vagy mező, típus átírása, `git pull` után (ha más módosította a contractot), a `prisma/contract.json` véletlen törlése után. Az `npm run build` és az `npm install` (a `postinstall` miatt) automatikusan lefuttatja.

### prisma db update

Amikor a contract **változott**, és az adatbázist ehhez kell igazítani, migrációs fájl készítése nélkül. Fejlesztés közben ez a leggyorsabb út (a Prisma 7-es `db push` megfelelője):

- új modellt vagy mezőt vettél fel, vagy töröltél egyet,
- a saját fejlesztői vagy gyakorló adatbázisodon kísérletezel,
- a típus átírása csak a kódbeli típust változtatja (pl. `TimestamptzString` → `TimestamptzJsDate`): ilyenkor az adatbázisban 0 művelet fut, csak az aláírás frissül.

Előtte érdemes megnézni, mit fog csinálni: `prisma db update --dry-run`. Tábla vagy oszlop törlése előtt megerősítést kér (az adatbázis nevét kell begépelni).

Közös (pl. éles vagy több ember által használt) adatbázison inkább a migrációkat használd (9. pont), mert a `db update` nem hagy nyomot a `migrations` mappában.

### prisma db sign

Amikor az adatbázis **már jó**, csak a Prisma nem tudja, hogy melyik contractnak felel meg:

- **meglévő adatbázis átvétele:** `contract infer` után (8. pont), a táblák már léteznek,
- **kézi SQL módosítás után:** ha pl. pgAdminban vagy SQL scripttel adtál hozzá egy oszlopot, és a contractot is ugyanígy módosítottad,
- **a `migrations` mappa elvesztése vagy törlése után** (pl. sablonból indított projektben): újra létrehozza a `migrations/app/refs/db.json` hivatkozást és a snapshotot,
- **`CONTRACT.MARKER_MISMATCH: Hash mismatch`** hibánál (pl. `db verify`, `migration status`), ha a contract változása az adatbázist nem érinti.

Ha az adatbázisból hiányzik valami, amit a contract leír, a `db sign` nem ír alá, hanem hibát ad, pl.:

```
[error] missing: database/public/filmek/column:hossz
[error] CONTRACT.SCHEMA_VERIFICATION_FAILED: Database schema does not satisfy contract (1 failure)
```

Ilyenkor a `db update` kell. Ha fordítva, az adatbázisban van több (pl. egy oszlop, amit a contract nem ismer), a `db sign` elfogadja.

### Tipikus sorrendek

| Helyzet                                                     | Parancsok                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| új, üres adatbázis                                          | `prisma contract emit` → `prisma db init`                                 |
| új mező / modell, fejlesztés közben                         | `prisma contract emit` → `prisma db update`                               |
| új mező / modell, migrációval                               | `prisma contract emit` → `prisma migration plan --name ...` → `prisma db migrate --advance-ref db` |
| csak a kódbeli típus változott (pl. `...String` → `...JsDate`) | `prisma contract emit` → `prisma db update` (0 művelet, új aláírás)    |
| meglévő adatbázis átvétele                                  | `prisma contract infer ...` → (átnézés) → `prisma contract emit` → `prisma db sign` |
| kézi SQL módosítás után                                     | contract módosítása → `prisma contract emit` → `prisma db sign`           |
| sablon klónozása után (a `migrations` mappa nélkül)          | `npm install` → `.env` → üres adatbázison `prisma db init`                |
| ellenőrzés                                                  | `prisma db verify`                                                        |

## 11. Minta adatok feltöltése (seed) ./prisma/seed.ts

A Prisma 8-ban a kapcsolódó rekordok egy lépésben (beágyazva) még nem hozhatók létre (`posts: { create: [...] }` → `ORM.COLUMN_UNKNOWN` hiba). Előbb a hivatkozott rekordot (a felhasználót) kell létrehozni, utána a hivatkozókat (a bejegyzéseket) az idegen kulccsal (`authorId`). Törléskor fordított a sorrend.

```ts
import { db } from "./db";

async function main() {
  // törlés a hivatkozások miatt fordított sorrendben: előbb a posztok, utána a felhasználók
  await db.orm.public.Post.where({}).deleteAll();
  await db.orm.public.User.where({}).deleteAll();
  await db.orm.public.Film.where({}).deleteAll();

  await db.orm.public.Film.createAll([
    { title: "A Pál utcai fiúk", content: "ifjúsági" },
    { title: "Egri csillagok", content: "történelmi" },
  ]);

  // előbb a felhasználó, utána a posztjai (authorId)
  const anna = await db.orm.public.User.create({ email: "anna@iskola.hu", name: "Kiss Anna" });
  await db.orm.public.Post.createAll([
    { title: "Első bejegyzés", content: "Helló világ!", authorId: anna.id },
    { title: "Második bejegyzés", authorId: anna.id },
  ]);

  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Futtatás:

> npm run db:seed<br>

Ellenőrzés (pl. egy végpontban vagy scriptben):

```ts
// felhasználók a bejegyzéseikkel
await db.orm.public.User.include("posts").all();
// bejegyzések a szerzőjükkel
await db.orm.public.Post.include("author").all();
```

## 12. Példa végpontok

A Prisma 8 láncolt API-t használ: a modellből indulunk (`db.orm.public.Film`), hozzáadjuk a szűrést (`where`), rendezést (`orderBy`) stb., a végén egy lezáró metódus (`all`, `first`, `create`, `update`, `delete`) futtatja a lekérdezést. Az `update` és a `delete` előtt mindig kell `where`.

./app/api/filmek/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/prisma/db";

export async function GET() {
  const filmek = await db.orm.public.Film.orderBy((f) => f.title.asc()).all();
  return NextResponse.json(filmek);
}

export async function POST(request: NextRequest) {
  const { title, content } = await request.json();
  try {
    const film = await db.orm.public.Film.create({ title, content });
    return NextResponse.json(film, { status: 201 });
  } catch (error) {
    // 23505: egyedi (@unique) megszorítás megsértése
    if (error instanceof Error && "sqlState" in error && error.sqlState === "23505") {
      return NextResponse.json({ message: "Ilyen címmel már van film!" }, { status: 409 });
    }
    throw error;
  }
}
```

./app/api/filmek/[id]/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/prisma/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const id = Number((await params).id);
  if (Number.isNaN(id)) return NextResponse.json({ message: "Hibás azonosító!" }, { status: 400 });

  const film = await db.orm.public.Film.where({ id }).first();
  if (!film) return NextResponse.json({ message: "Nincs ilyen film!" }, { status: 404 });
  return NextResponse.json(film);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const id = Number((await params).id);
  if (Number.isNaN(id)) return NextResponse.json({ message: "Hibás azonosító!" }, { status: 400 });

  // nem létező rekordnál a delete (és az update) nem dob hibát, hanem null-t ad vissza
  const film = await db.orm.public.Film.where({ id }).delete();
  if (!film) return NextResponse.json({ message: "Nincs ilyen film!" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
```

Gyakori műveletek (Prisma 7 → Prisma 8):

| Prisma 7                                           | Prisma 8                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `prisma.film.findMany()`                           | `db.orm.public.Film.all()`                                                   |
| `findMany({ where: { ev: 1968 } })`                | `db.orm.public.Film.where({ ev: 1968 }).all()`                               |
| `findUnique({ where: { id } })`                    | `db.orm.public.Film.where({ id }).first()` (nincs találat: `null`)           |
| `orderBy: { title: "asc" }`                        | `.orderBy((f) => f.title.asc())`                                             |
| `take` / `skip`                                    | `.limit(n)` / `.offset(n)`                                                   |
| `select: { title: true }`                          | `.select("id", "title")`                                                     |
| `include: { mufaj: true }`                         | `.include("mufaj")`                                                          |
| `where: { title: { contains: "egri" } }`           | `.where((f) => f.title.like("%egri%"))`                                      |
| `create({ data: {...} })`                          | `db.orm.public.Film.create({ ... })` (nincs `data:` csomagolás)              |
| `createMany({ data: [...] })`                      | `db.orm.public.Film.createAll([...])`                                        |
| `update({ where: { id }, data: {...} })`           | `db.orm.public.Film.where({ id }).update({ ... })`                           |
| `delete({ where: { id } })`                        | `db.orm.public.Film.where({ id }).delete()`                                  |
| `updateMany` / `deleteMany`                        | `.where(...).updateAll({ ... })` / `.where(...).deleteAll()`                 |
| `count()`                                          | `.aggregate((a) => ({ db: a.count() }))`                                     |
| hiba `P2002` (egyedi érték ütközés)                | `sqlState === "23505"`                                                       |
| hiba `P2003` (idegen kulcs)                        | `sqlState === "23503"`                                                       |
| hiba `P2025` (nincs ilyen rekord)                  | az `update` / `delete` `null`-t ad vissza                                    |

./tests.http (VS Code REST Client, a projekt gyökerében)

```http
### Összes film
GET http://localhost:3000/api/filmek

### Új film
POST http://localhost:3000/api/filmek
Content-Type: application/json

{
  "title": "Kincskereső kisködmön",
  "content": "ifjúsági"
}

### Egy film
GET http://localhost:3000/api/filmek/1

### Film törlése
DELETE http://localhost:3000/api/filmek/1
```

## 13. Adatok kezelése az adatbázisban

- **Prisma Studio:** a Prisma 8 CLI-ben nincs, a Prisma 7-es CLI-ből indítható. A projekt mappáján **kívülről** kell indítani, mert a Prisma 7 nem tudja olvasni a Prisma 8-as `prisma.config.ts`-t:
  ```powershell
  cd ..
  npx prisma@7 studio --url "postgresql://postgres:jelszo@localhost:5432/filmekdb"
  ```
  (böngészőben: `http://localhost:5555`)
- **pgAdmin 4:** a PostgreSQL telepítővel és a zip csomaggal is érkezik
- **dbForge Studio for PostgreSQL:** ingyenes Express kiadás, a 2026.1-es verziótól Visual Query Builderrel
- **DBeaver Community:** ingyenes, sokféle adatbázist kezel
- **VS Code PostgreSQL bővítmény** (Microsoft, `ms-ossdata.vscode-pgsql`): táblák böngészése, SQL futtatás a VS Code-ban
- **Neon Console:** a Neon webes felületén SQL Editor és Tables nézet
- **psql:** parancssori kliens, pl. `psql -h localhost -U postgres -d filmekdb`

## 14. Hasznos trükkök, buktatók

- **`'prisma' is not recognized as an internal or external command`:** a Prisma CLI a projekt fejlesztői függősége, ezért `npx prisma ...` alakban (vagy `npm run ...` scripttel) kell futtatni.
- **Nincs IntelliSense és formázás a `contract.prisma`-ban:** a VS Code Prisma bővítménye a projekt `node_modules/prisma` mappájából indítja a Prisma 8 nyelvi szervert. Ellenőrizd, hogy le van-e futtatva az `npm install`, és hogy a contract első sora `// use prisma-8`, majd a VS Code-ban: **Ctrl+Shift+P → Developer: Reload Window**.
- **`CLI.CONFIG_UNREADABLE ... config loading resolved E:/... instead of e:\...`:** a parancssor (`cmd`) kisbetűs meghajtójellel áll a mappában. Futtasd a parancsot PowerShellből (2.1 pont), vagy lépj be újra nagybetűvel: `cd /d E:\...`.
- **`Cannot find module 'prisma/config'`:** a `prisma.config.ts`-ben a `definePrismaConfig`-et a `@prisma/cli-engine` csomagból kell importálni (3. pont).
- **`Cannot find module '.../prisma/contract.json'`:** elmaradt a `prisma contract emit`. A contract minden módosítása után futtatni kell, különben a TypeScript sem látja az új mezőket (a VS Code-ban néha **TypeScript: Restart TS Server** is kell).
- **`RUNTIME.TEMPORAL_UNAVAILABLE`:** a contractban `JsDate` nélküli dátumtípus (`DateTime`, `Timestamptz`, `Timestamp`, `temporal.updatedAt()`) szerepel, lásd 7. pont.
- **`DRIVER.CONNECTION_FAILED`:** nem fut a szerver, hibás a `.env`-ben a connection string, vagy nem létezik az adatbázis (a Prisma 8 nem hozza létre). A `why:` sor mondja meg a pontos okot:
  - `password authentication failed for user '...'`: rossz a jelszó, vagy (Neonon) a hostnévben helyőrző maradt (6.3 pont),
  - `database "..." does not exist`: nincs létrehozva az adatbázis, vagy kimaradt az URL-ből az adatbázisnév (`/neondb`, `/filmekdb`).
- **`CONTRACT.MARKER_READ_FAILED` … `Postgres driver not connected`** (pl. a seed vagy egy végpont futásakor): a program nem kapott connection stringet: üres vagy hiányzik a `.env`, vagy nincs benne `DATABASE_URL`. Ha a `.env` véletlenül kiürült, a VS Code-ban a **Timeline** panelen (vagy **Local History: Find Entry to Restore**) visszaállítható.
- **`npm error ERESOLVE ... @eslint/js`:** az `@eslint/js` csomagot nem kell külön telepíteni, az ESLint magával hozza (2.2 pont). Ha mégis kell, csak az ESLint-tel egyező fő verzióval: `npm i -D @eslint/js@9`.
- **`npm warn allow-scripts ...`:** lásd 2.3 pont.
- **A `next build` egy migrációs fájl miatt áll le:** a `migrations` mappa hiányzik a `tsconfig.json` `exclude` listájából (4. pont).
- **`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'`:** a `pg` driver figyelmeztetése, a működést nem befolyásolja. A `DATABASE_URL`-ben és a `DIRECT_URL`-ben `sslmode=verify-full`-lal eltűnik.
- **A `.env` betöltése:** a Next.js magától betölti, a Prisma CLI a `prisma.config.ts`, a saját scriptek (pl. seed) a `prisma/db.ts` `import "dotenv/config"` sora miatt.
- **`Type 'string' is not assignable to type 'Varchar<200>'`:** a `VarChar(n)` mezőkbe típuskényszerítéssel kell írni (`... as Varchar<200>`, lásd 7. pont), vagy a contractban `String` típust kell használni.
- **`Numeric` / `Decimal` mezők:** szövegként jönnek vissza (`"3990.00"`), számolni a `Number(...)` alakkal lehet.
- **Az URL paraméter szöveg:** `Number(id)`, és `Number.isNaN(...)` ellenőrzés kell.
- **CLI kimenet:** egyes környezetekben (pl. nem interaktív terminálban) a Prisma CLI JSON sorokat ír ki. Olvashatóbb a `--format markdown` kapcsolóval.
- **`prisma-8.md`:** az `orm init` által létrehozott rövid Prisma 8 összefoglaló, érdemes elolvasni.
- **AI-kódolóügynökök:** a `prisma skills sync` a Prisma 8 aktuális tudását teszi elérhetővé az ügynököknek (pl. Claude, Cursor). Tanulói projektben nem szükséges.
- **Egy projekt, egy `migrations` mappa:** lásd a 3. pont figyelmeztetését.

## 15. Linkek, dokumentációk

- [Next.js](https://nextjs.org/docs)
- [Typescript](https://www.typescriptlang.org/)
- [DevDocs](https://devdocs.io/)
- [Prisma ORM 8](https://www.prisma.io/docs/orm)
- [Prisma 8: kézi beállítás PostgreSQL-lel (from scratch)](https://www.prisma.io/docs/prisma-orm/from-scratch)
- [Prisma 8: meglévő PostgreSQL adatbázis (contract infer, db sign)](https://www.prisma.io/docs/prisma-orm/add-to-existing-project/postgresql)
- [Prisma 8: Coming from Prisma ORM 7](https://www.prisma.io/docs/orm/coming-from-prisma-orm-7)
- [Prisma 8: adatmodellezés](https://www.prisma.io/docs/orm/data-modeling)
- [Prisma 8: PSL contract szintaxis](https://www.prisma.io/docs/orm/contract-authoring/psl-syntax)
- [Prisma 8: ORM client referencia](https://www.prisma.io/docs/orm/reference/orm-client)
- [Prisma 8: migrációk](https://www.prisma.io/docs/orm/migrations/how-migrations-work)
- [Prisma 8: konfiguráció (prisma.config.ts)](https://www.prisma.io/docs/cli/configuration)
- [Prisma 8 release status](https://www.prisma.io/docs/orm/release-status)
- [npm install-scripts (allowScripts)](https://docs.npmjs.com/cli/commands/npm-install-scripts)
- [Neon + Prisma](https://neon.com/docs/guides/prisma)
- [PostgreSQL letöltés (Windows)](https://www.postgresql.org/download/windows/)
- [PostgreSQL zip binárisok (EDB)](https://www.enterprisedb.com/download-postgresql-binaries)
- [PostgreSQL dokumentáció](https://www.postgresql.org/docs/)
