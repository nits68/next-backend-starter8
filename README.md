# Next.js-TS-Prisma 8-PostgreSQL REST API starter

- https://www.prisma.io/docs/prisma-orm/from-scratch
- https://www.prisma.io/docs/prisma-orm/add-to-existing-project/postgresql
- https://www.prisma.io/docs/orm/coming-from-prisma-orm-7

Két környezetre készül:

- **Vizsga:** helyi, localhost-ra telepített PostgreSQL szerver (lásd 6.1, vagy 6.2)
- **Órai munka, projekt:** [Neon](https://neon.com) ingyenes felhős PostgreSQL (lásd 6.3)

A kód mindkét esetben ugyanaz, csak a `.env` állományban lévő connection string különbözik.

> [!IMPORTANT]
> **A Prisma 8 jelenleg release candidate.** 2026 novemberében `prisma@8.0.0-rc.33` (parancssori eszköz) és `@prisma/orm-postgres@8.0.0-rc.23` (könyvtár), a végleges kiadás hamarosan várható. Mivel az RC-k között az írásmód is változhat (lásd 7. pont: dátummezők), a sablon a Prisma- és a Next.js-csomagokat **pontos verzióra rögzíti** (`^` nélkül, lásd 2.2). A PostgreSQL-támogatás a legérettebb része, de a végleges kiadásig az API kis mértékben még változhat.
>
> Követelmények:
>
> - **Node.js 22.18+** (a 24-es ágon **24.11+**, a 24.0-24.10 nem jó), ajánlott a Node.js 24
> - **TypeScript 5.9+** (a `create-next-app` jelenleg 5.9.x-et telepít)
> - **PostgreSQL 15+** (a 18.x ajánlott)
> - `"type": "module"` a `package.json`-ban (az `orm init` korábban beállította, az rc.27-es óta már nem, ezért kézzel add hozzá)
> - Windowson a telepítést és a Prisma parancsokat **PowerShell** terminálból futtasd (lásd 2.1)

## Mi változott a Prisma 7-hez képest?

A Prisma 8 egy teljesen újraírt, tisztán TypeScript alapú ORM. A séma helyett **contract** van, a generált kliens helyett a contractból **emitált** fájlokat használjuk, és új, láncolt lekérdező API-t kapunk.

**Miért jövőbiztos?** A Prisma 8 a Prisma fejlesztésének iránya. A Prisma 7 a Prisma 8 végleges kiadása után még 18 hónapig kap javításokat, utána nem. A contract egyetlen, jól olvasható fájl, a migrációk TypeScript fájlok, amelyeket el is lehet olvasni és szerkeszteni.

## 1. Projekt inicializálása a create-next-app sablonnal

Kérdések nélkül, beállítással kapcsolókkal:

> npx create-next-app@latest next-backend-starter8 --api --ts --eslint --app --no-tailwind --no-src-dir --no-react-compiler --no-agents-md --import-alias "@/\*" --use-npm<br>
> cd next-backend-starter8<br>

A kapcsolók:

| Kapcsoló               | Jelentése                                                                         |
| ---------------------- | --------------------------------------------------------------------------------- |
| `--api`                | csak API (App Router route handlerek), felhasználói felület nélkül                |
| `--ts`                 | TypeScript                                                                        |
| `--eslint`             | ESLint                                                                            |
| `--app`                | app router-t használ                                                              |
| `--no-tailwind`        | Tailwind CSS nélkül (API-hoz nem kell)                                            |
| `--no-src-dir`         | nincs `src` mappa, az `app` a projekt gyökerében van                              |
| `--no-react-compiler`  | React Compiler nélkül                                                             |
| `--no-agents-md`       | nem hozza létre az AI-kódolóügynököknek szóló `AGENTS.md` és `CLAUDE.md` fájlokat |
| `--import-alias "@/*"` | az `@/` előtag a projekt gyökerére mutat (pl. `@/prisma/db`)                      |
| `--use-npm`            | npm csomagkezelő                                                                  |

Az `--api` sablon ESLint konfigurációs fájlt nem hoz létre, azt a 4. pontban pótoljuk.

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
> npm i -E -D prisma@8.0.0-rc.33 @prisma/cli-engine@0.9.0<br>
> npm i -E @prisma/orm-postgres@8.0.0-rc.23<br>
> npm install-scripts deny esbuild unrs-resolver<br>

**Pontos verziók.** A Prisma 8 RC-i között nemcsak hibajavítások, hanem írásmód-változások is vannak (pl. a dátummezőknél, 7. pont). A `^` jel (pl. `^8.0.0-rc.23`) megengedné, hogy egy későbbi `npm install` magától újabb RC-t telepítsen, és a contract váratlanul hibás legyen. Ezért ez az öt csomag **pontos verzión** (`^` nélkül) szerepel a `package.json`-ban:

| Csomag                 | Verzió        | Miért rögzített?                                                      |
| ---------------------- | ------------- | --------------------------------------------------------------------- |
| `prisma`               | `8.0.0-rc.33` | release candidate, az RC-k között változhat az írásmód                |
| `@prisma/orm-postgres` | `8.0.0-rc.23` | release candidate, a `prisma` CLI-vel együtt kell frissíteni          |
| `@prisma/cli-engine`   | `0.9.0`       | a `prisma.config.ts` ebből importál, a CLI-vel együtt kell frissíteni |
| `next`                 | `16.4.5`      | a `create-next-app` eleve pontos verzióval telepíti                   |
| `eslint-config-next`   | `16.4.5`      | a `next`-tel azonos verziónak kell lennie                             |

Az `-E` (`--save-exact`) kapcsoló írja a pontos verziót a `package.json`-ba (az `orm init` `^`-jellel telepít, ezért kell újra telepíteni a három Prisma-csomagot). A többi csomag (`dotenv`, `prettier`, `tsx`, `typescript` stb.) maradhat `^`-jellel.

**Frissítés.** A Prisma-csomagokat tudatosan, együtt érdemes frissíteni, szintén `-E`-vel (pl. `npm i -E -D prisma@latest`, `npm i -E @prisma/orm-postgres@latest`). Előtte érdemes megnézni, hogy a két csomag ugyanazt a belső `@prisma/orm-toolchain` verziót használja-e (lásd 2.4), utána pedig `npx prisma contract emit` és ellenőrzés (`npm ls @prisma/orm-framework`, `npx tsc --noEmit`, `npm run build`).

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
- a `package.json`-ba felveszi a `contract:emit` scriptet (a `"type": "module"` beállítást az rc.27 óta már nem írja be, add hozzá kézzel)
- a `tsconfig.json`-ban beállítja a `"module": "preserve"` és a `"types": ["node"]` opciókat (a Next.js-nek ez megfelel)
- kiegészíti a `.gitignore`-t, létrehozza a `.gitattributes`-t (a generált fájlok jelölésére)
- a contractból legenerálja a `prisma/contract.json` és a `prisma/contract.d.ts` állományokat

A `prisma` CLI a projekt fejlesztői függősége, ezért a parancsokat `npx prisma ...` alakban (vagy a `package.json` scriptjeivel, `npm run ...`) kell futtatni, internet nélkül is működnek. A VS Code Prisma bővítménye is a projekt `node_modules/prisma` mappájából indítja a Prisma 8 nyelvi szerverét (IntelliSense, formázás, hibajelzés a `contract.prisma`-ban).

A Prisma 8 CLI magával hozza a Prisma felhős alkalmazás-telepítő eszközét (Prisma Composer) is. A korábbi RC-knél emiatt a `node_modules` mappa kb. 135 000 fájlból állt, a `prisma@8.0.0-rc.33` óta már csak kb. 32 000-ből (a Prisma 7-nél kb. 30 000 volt). A futó alkalmazás ebből semmit nem használ, csak az `@prisma/orm-postgres` könyvtárat.

**Ellenőrzés:** a `prisma` mappában legyen ott a `contract.json` és a `contract.d.ts`. Ha hiányoznak, a `prisma/db.ts` importjai hibát jeleznek (`Cannot find module './contract.d'`, `Cannot find module './contract.json'`). Ilyenkor futtasd le:

> npx prisma contract emit<br>

### 2.3 Telepítési figyelmeztetések (allowScripts)

Az npm 11 minden telepítésnél figyelmeztet azokra a csomagokra, amelyek telepítéskor scriptet futtatnának, de nincs róluk döntés:

```
npm warn allow-scripts 2 packages have install scripts not yet covered by allowScripts:
npm warn allow-scripts   esbuild@0.28.2 (postinstall: node install.js)
npm warn allow-scripts   unrs-resolver@1.13.0 (postinstall: node postinstall.js)
```

A 2.2 pont utolsó parancsa (`npm install-scripts deny esbuild unrs-resolver`) erről dönt: letiltja a scriptek futtatását, és a döntést a `package.json`-ba írja, így a figyelmeztetés többet nem jelenik meg:

```json
"allowScripts": {
  "esbuild": false,
  "unrs-resolver": false
}
```

Egyik script sem kell a működéshez: az `esbuild` (ezt a `tsx` használja) és az `unrs-resolver` (ezt az `eslint-config-next` használja) a platformnak megfelelő binárisát külön csomagként kapja meg, a script csak ellenőrzi. A korábbi Prisma CLI verziók (rc.33 előtt) a `workerd` csomagot (Cloudflare futtatókörnyezet) is telepítették, ezt is le kellett tiltani. A `deny` csak telepített csomagra működik, nem telepítettre `ENOMATCH` hibát ad, ezért mindig az `npm install-scripts ls` által listázott csomagokat add meg. Kipróbálva: a `tsx`, az ESLint és a `next build` a letiltás után is működik. A függőben lévő csomagok listája: `npm install-scripts ls`. Ha később új csomag kerül a listára, ugyanígy dönthetsz róla (`approve` = engedélyez, `deny` = letilt).

### 2.4 További telepítési figyelmeztetések, verzióeltérés (ERESOLVE, vulnerabilities)

**`CLI.UNEXPECTED: Cannot use 'in' operator to search for 'kind' in typeChoice`** (a `prisma contract emit`, és vele a `postinstall` és a `build` futásakor): a `prisma` CLI és az `@prisma/orm-postgres` könyvtár nem illik össze, mert eltérő belső `@prisma/orm-toolchain` / `@prisma/orm-framework` verziót használnak. Ilyenkor a projektbe mindkettő bekerül, és a kettő nem érti egymás adatait. Ez pl. a `prisma@8.0.0-rc.29` (belül rc.21) és az `@prisma/orm-postgres@8.0.0-rc.22` párosnál fordult elő. A jelenlegi `prisma@8.0.0-rc.33` és `@prisma/orm-postgres@8.0.0-rc.23` ugyanazt a belső verziót (rc.23) használja, így nincs ilyen gond.

Frissítés előtt így ellenőrizhető, hogy a két csomag illik-e össze (a két sorban ugyanaz a verzió szerepeljen):

```powershell
npm view prisma@latest dependencies --json | Select-String orm-toolchain
npm view @prisma/orm-postgres@latest dependencies --json | Select-String orm-toolchain
```

Telepítés után: `npm ls @prisma/orm-framework` – csak egyféle verziószám szerepeljen. Ha mégis eltérnek, a `package.json`-ban egy `overrides` bejegyzés a CLI-t is a könyvtár verziójára kényszeríti (utána `npm install`):

```json
"overrides": {
  "@prisma/orm-toolchain": "<az @prisma/orm-postgres verziója>"
}
```

Ha a két csomag később ismét ugyanazt a verziót használja, az `overrides` bejegyzést törölni kell (`npm pkg delete overrides`), különben egy régebbi belső verziót kényszerítene a projektbe.

**`npm warn ERESOLVE overriding peer dependency ... @effect/vitest ... effect`:** a Prisma CLI korábbi verzióinál a felhős telepítő rész (Prisma Composer) belső függőségei között volt egy verzióütközés (az `alchemy` újabb `@effect/vitest`-et kért, mint amilyen `effect` verziót a Composer rögzített). Az npm feloldotta, ezért csak figyelmeztetés volt, és egy `overrides` bejegyzés a `package.json`-ban eltüntette. A `prisma@8.0.0-rc.27` óta már nem jelentkezik, ezért a bejegyzés törölve lett. Ha egy későbbi verziónál mégis előjönne a figyelmeztetés, az `"overrides": { "@effect/vitest": "<a Composer által kért verzió>" }` bejegyzéssel ismét elnémítható.

**`12 moderate severity vulnerabilities`** (a `prisma@8.0.0-rc.33` és a `next@16.4.5` mellett): mind a 12 közepes súlyosságú, és fejlesztői eszközök függőségeiből jön, amelyeket csak fejlesztés közben, a saját gépen használunk: a `prisma` parancssori eszközéből (`@prisma/compute-sdk`, `@vercel/nft`, `glob`) és az ESLint-csomagokból (`eslint-config-next`, `typescript-eslint` és `@typescript-eslint/*`, `minimatch`). A korábbi RC-knél még 13 volt, ebből 8 magas súlyosságú. A futó alkalmazás függőségeiben (`next`, `@prisma/orm-postgres`, `dotenv`) nincs sérülékenység, ez így ellenőrizhető:

```powershell
npm audit --omit=dev
```

```
found 0 vulnerabilities
```

> [!WARNING]
> Az `npm audit fix --force` parancsot **ne** futtasd: a "javítás" a `prisma` csomagot a 7-es verzióra (`fix: prisma@7.10.1`), az `eslint-config-next`-et pedig a Next.js 15-ös verziójához tartozóra (`fix: eslint-config-next@15.5.29`) állítaná vissza, ami a projektet elrontaná. A figyelmeztetések a Prisma 8 végleges kiadásával, a Prisma CLI frissítésekor várhatóan eltűnnek (`npm i -D prisma@latest`).

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
    "yoavbls.pretty-ts-errors"
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
        "isDefault": true,
      },
    },
    {
      "type": "npm",
      "script": "test",
      "group": {
        "kind": "test",
        "isDefault": true,
      },
    },
  ],
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
  "db:setup": "prisma contract emit && prisma db init && tsx prisma/seed.ts",
  "db:infer1": "npx prisma contract infer --output ./prisma/contract.prisma",
  "db:infer2": "npx prisma contract emit && npx prisma db sign",
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

./prisma/db.ts (az `orm init` létrehozta; egészítsd ki, hogy a Next.js hot reload miatt egyetlen kliens példány legyen, de a contract változásakor új készüljön):

```ts
import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

const contract = contractFromJson<Contract>(contractJson);

const createDb = () => postgres({ contract, url: process.env["DATABASE_URL"]! });
type Db = ReturnType<typeof createDb>;

// Egyetlen kliens példány a Next.js hot reload miatt. Ha a contract megváltozik
// (prisma contract emit), új kliens készül, a régi kapcsolatai lezárulnak.
const globalForDb = globalThis as unknown as { db?: Db; dbContractHash?: string };
const contractHash = contractJson.storage.storageHash;

if (!globalForDb.db || globalForDb.dbContractHash !== contractHash) {
  void globalForDb.db?.close();
  globalForDb.db = createDb();
  globalForDb.dbContractHash = contractHash;
}

export const db = globalForDb.db;
export default db;
```

- **Miért nem elég a kliens egyszerű megtartása?** A hot reload során a `db.ts` újrafut, ezért a klienst a `globalThis`-en tároljuk, különben minden mentés új kapcsolatkészletet nyitna. Ha azonban mindig a régi klienst adnánk vissza, a `contract emit` után is a **régi contracttal** dolgozna: az új modellek, mezők "nem léteznének" (pl. `Cannot read properties of undefined (reading 'all')`), amíg a fejlesztői szervert újra nem indítod. Ezért a kliens a contract hash-ét (`storageHash`) is megjegyzi, és változáskor újat készít.
- **`contractJson` helyett `contract`:** az `@prisma/orm-postgres` rc.20-tól a `postgres()` nem a nyers `contract.json`-t (`contractJson` opció), hanem a `contractFromJson<Contract>(contractJson)` által előállított contractot várja (`contract` opció). A régi hívás `Object literal may only specify known properties, but 'contractJson' does not exist` típushibát ad (`next build`, `tsc`).
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
psql -h localhost -U postgres -c "CREATE DATABASE mydb;"
```

Az adatbázis neve **kisbetűs** legyen: a PostgreSQL az idézőjel nélküli neveket kisbetűsre alakítja (`CREATE DATABASE MyDB` → `mydb`), a connection stringben viszont pontosan egyeznie kell.

.env

```
DATABASE_URL="postgresql://postgres:jelszo@localhost:5432/mydb"
```

A jelszóban lévő speciális karaktereket (`@`, `:`, `/`, `#`, `%` stb.) URL-kódolni kell (pl. `@` → `%40`).

### 6.2 Helyi PostgreSQL telepítés nélkül (PostgreSQL zip binárisok)

Hordozható, "igazi" PostgreSQL szerver, Windows-szolgáltatás nélkül: a szerver csak akkor fut, amikor elindítod, és rendszergazdai jog sem kell hozzá.

**Letöltés:**

1. Nyisd meg az EDB oldalát: [https://www.enterprisedb.com/download-postgresql-binaries](https://www.enterprisedb.com/download-postgresql-binaries)
2. A **Binaries from installer Version 18.x** sorban kattints a **Windows x86-64** ikonra.
3. Letöltődik a `postgresql-18.x-x-windows-x64-binaries.zip` állomány (2026 szeptemberében: `postgresql-18.6-4-windows-x64-binaries.zip`, kb. 365 MB).

**Kicsomagolás:** a zip egy `pgsql` mappát tartalmaz, ezt csomagold ki a `c:\` gyökerébe, így a programok a `c:\pgsql\bin` mappába kerülnek. A csomagban a **pgAdmin 4** is benne van (`c:\pgsql\pgAdmin 4\runtime\pgAdmin4.exe`). Ha induláskor hiányzó DLL-re (pl. `VCRUNTIME140.dll`) panaszkodik, telepíteni kell a [Microsoft Visual C++ Redistributable (x64)](https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist) csomagot.

**Az adatkönyvtár létrehozása** (csak egyszer kell; a `-W` kapcsoló bekéri a `postgres` felhasználó jelszavát):

./data/1_initPostgres.bat

```bat
if not exist "c:\pgdata\" c:\pgsql\bin\initdb.exe -D c:\pgdata -U postgres -W -E UTF8 -A scram-sha-256
pause
```

**A `data` mappa scriptjei** a használat sorrendjében vannak számozva:

| Script                 | Mit csinál                                 |
| ---------------------- | ------------------------------------------ |
| `1_initPostgres.bat`   | az adatkönyvtár létrehozása (csak egyszer) |
| `2_startPostgres.bat`  | a szerver indítása                         |
| `3_createDB.bat`       | adatbázis létrehozása (a nevét bekéri)     |
| `4_statusPostgres.bat` | fut-e a szerver                            |
| `5_pgAdmin.bat`        | a pgAdmin 4 indítása                       |
| `6_stopPostgres.bat`   | a szerver leállítása                       |

**Indítás:**

./data/2_startPostgres.bat

```bat
@echo off
set PGBIN=c:\pgsql\bin
set PGDATA=c:\pgdata
set PGLOG=c:\pgsql\postgres.log
echo A PostgreSQL inditasa...
powershell -NoProfile -Command "Start-Process -FilePath '%PGBIN%\pg_ctl.exe' -ArgumentList '-D','%PGDATA%','-l','%PGLOG%','start' -WindowStyle Hidden"

rem Varakozas, amig a szerver fogadni tudja a kapcsolatokat (legfeljebb kb. 15 masodperc):
for /l %%i in (1,1,15) do (
  %PGBIN%\pg_ctl.exe -D %PGDATA% status >nul 2>&1
  if not errorlevel 1 goto ready
  >nul ping -n 2 127.0.0.1
)

echo.
echo A szerver nem indult el idoben. A naplo (%PGLOG%) vege:
echo.
powershell -NoProfile -Command "Get-Content '%PGLOG%' -Tail 15"
echo.
pause
exit /b 1

:ready
echo.
%PGBIN%\pg_ctl.exe -D %PGDATA% status
echo.
echo A szerver fut, ez az ablak bezarhato. Leallitas: a stopPostgres scripttel.
pause
```

> **A napló szándékosan a `c:\pgdata` mappán kívülre, a `c:\pgsql\postgres.log` fájlba kerül.** Ha a
> naplófájl a PGDATA-ban van, egy nem szabályos leállás (például az indító ablak bezárása) után a
> szerver nem tud újraindulni: a helyreállításkor végigszinkronizálja a PGDATA összes fájlját, és a
> megnyitva tartott naplófájlon ez `could not open file "./postgres.log": sharing violation`
> hibával elszáll.

> **Miért PowerShell-lel indul?** A `pg_ctl`-lel közvetlenül indított szerver ahhoz a cmd ablakhoz
> tartozik, amelyikből indult: az ablak bezárása leállítja (`received fast shutdown request` a
> naplóban). A `Start-Process` külön, rejtett konzolt ad neki, így az indító ablak bezárható.
> A `-Wait` kapcsoló és a kimenet átirányítása (`-RedirectStandardOutput`) viszont **nem**
> használható: mindkettő a futva maradó `postgres.exe`-re (illetve az általa örökölt handle-ökre)
> várna, és a parancsfájl soha nem lépne tovább - az ablak némán állna. Ezért indul "eldobva", és a
> script utána `pg_ctl status`-szal várja meg, hogy a szerver fogadni tudja a kapcsolatokat.

**Állapot:**

./data/4_statusPostgres.bat

```bat
c:\pgsql\bin\pg_ctl.exe -D c:\pgdata status
pause
```

**A pgAdmin 4 indítása** (a szervernek futnia kell; a `start ""` miatt külön processzként indul, ezért a parancsablak rögtön bezárható). SQL futtatása benne: a bal oldali fában jelöld ki az adatbázist, majd jobb klikk → **Query Tool** (`Alt+Shift+Q`), és **F5**:

./data/5_pgAdmin.bat

```bat
@echo off
rem A pgAdmin 4 grafikus felulet inditasa. A "start" miatt kulon processzkent indul,
rem ezert ez az ablak rogton bezarhato (a pgAdmin fut tovabb).
rem
rem A pgAdmin elso inditasa lassu (sajat webkiszolgalot indit), legy turelemmel.
rem Kapcsolodas: Host localhost, Port 5432, Username postgres, a jelszo az initdb-nel megadott.

set PGADMIN="c:\pgsql\pgAdmin 4\runtime\pgAdmin4.exe"

if not exist %PGADMIN% (
  echo Nem talalhato: %PGADMIN%
  echo Ellenorizd a pgAdmin telepitesi helyet, es ird at a PGADMIN valtozot!
  pause
  exit /b 1
)

echo A pgAdmin 4 inditasa...
start "" %PGADMIN%
```

**Leállítás:**

./data/6_stopPostgres.bat

```bat
@echo off
c:\pgsql\bin\pg_ctl.exe -D c:\pgdata stop
pause
```

**Az adatbázis létrehozása** (a szerver elindítása után). A script futtatáskor bekéri az adatbázis nevét, a `createdb.exe` pedig a `postgres` felhasználó jelszavát:

./data/3_createDB.bat

```bat
@echo off
setlocal
rem Uj adatbazis letrehozasa. A nevet futtataskor kerdezi meg.
rem A createdb bekeri a postgres felhasznalo jelszavat (az initdb-nel megadott jelszo).

set PGBIN=c:\pgsql\bin

set "DBNAME="
set /p DBNAME="Az uj adatbazis neve: "

if "%DBNAME%"=="" (
  echo.
  echo Nem adtal meg nevet, kilepes.
  pause
  exit /b 1
)

echo.
echo A(z) "%DBNAME%" adatbazis letrehozasa...
%PGBIN%\createdb.exe -h localhost -p 5432 -U postgres -E UTF8 "%DBNAME%"

if errorlevel 1 (
  echo.
  echo Nem sikerult letrehozni. Fut a szerver? Letezik mar ilyen nevu adatbazis?
) else (
  echo.
  echo Kesz: %DBNAME%
  echo A .env-ben a kapcsolat igy nez ki:
  echo   DATABASE_URL="postgresql://postgres:jelszo@localhost:5432/%DBNAME%"
)
pause
```

Ugyanez psql-lel:

```powershell
c:\pgsql\bin\psql.exe -h localhost -U postgres -c "CREATE DATABASE mydb;"
```

A `.env` ugyanaz, mint a 6.1.2 pontban (port `5432`).

Ha ugyanazon a gépen a telepített (6.1) PostgreSQL szolgáltatás is fut, a kettő ütközik az 5432-es porton. Ilyenkor a szolgáltatást állítsd le, vagy a zip-es szervert más porton indítsd: `pg_ctl ... -o "-p 5433" start` (és a `.env`-ben is `5433` legyen).

### 6.3 Neon (órai munka, projekt feladat)

1. Regisztráció a [neon.com](https://neon.com) oldalon (GitHub vagy Google fiókkal is lehet), majd új projekt létrehozása (régió: pl. `AWS Europe Central (Frankfurt)`). A Neon a `neondb` adatbázist automatikusan létrehozza.
2. A projekt **Dashboard** oldalán a **Connect** gombbal nyílik meg a connection string. A **Connection pooling** kapcsolóval a pooled (a hosztnévben `-pooler` szerepel) és a direkt változat között lehet váltani.
3. A `.env`-be mindkét változóba a **direkt** (`-pooler` nélküli) cím kerüljön: a program a `DATABASE_URL`-t, a Prisma CLI (migrációk, `contract infer`) a `DIRECT_URL`-t használja:

```
# --- Helyi PostgreSQL (vizsga) ---
# DATABASE_URL="postgresql://postgres:jelszo@localhost:5432/mydb"

# --- Neon ---
DATABASE_URL="postgresql://neondb_owner:<JELSZÓ>@<SAJÁT-VÉGPONT>.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:<JELSZÓ>@<SAJÁT-VÉGPONT>.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
```

- A `<JELSZÓ>` és a `<SAJÁT-VÉGPONT>` helyére a Neon **Connect** ablakából másolt értékek kerülnek. A végpont neve `ep-`-vel kezdődik (pl. `ep-rapid-shape-b1h8o5g5`), a régió része (`c-5.eu-central-1`) is projektenként eltérhet. Ha a helyőrző benne marad, a Neon félrevezető módon `password authentication failed` hibát ad.
- **Miért nem a pooled cím?** A Prisma 8 (rc.23-tól) minden kapcsolódáskor `DateStyle=ISO` és `lc_monetary=C` beállítást küld, a Neon pooled kapcsolata (PgBouncer) viszont az `lc_monetary`-t nem fogadja el, így a program (és a seed) ezzel a hibával áll le: `unsupported startup parameter in options: lc_monetary. Please use unpooled connection` (`CONTRACT.MARKER_READ_FAILED`). A direkt kapcsolat ezt elfogadja; fejlesztéshez és órai munkához bőven elég (az ingyenes csomagban is több mint 100 egyidejű kapcsolat). A pooled cím a hosztnévben `-pooler` részt tartalmaz, ezt ne használd.
- Az URL-ben az adatbázis neve (`/neondb`) se maradjon ki. Ha a `/neondb` kimarad, a hiba: `database "neondb_owner" does not exist` (a `pg` driver ilyenkor a felhasználónevet használja adatbázisnévként).
- A Neon által adott URL-ekben `sslmode=require` áll. A `verify-full` értékkel eltűnik a `pg` driver `SECURITY WARNING` figyelmeztetése (a biztonság nem változik, a `pg` a `require`-t eddig is így kezelte). A Prisma 8 CLI is a `pg` drivert használja, ezért a `DIRECT_URL`-ben is írható. Ha ott mégis gondot okozna, a `require` is működik (csak a figyelmeztetés jelenik meg).
- A tétlenség miatt leállt Neon adatbázis újraindulása néhány másodpercig tart, ez külön beállítás nélkül is belefér: a Prisma 8 CLI (`pg` driver) alapból időkorlát nélkül, a program kliense 20 másodpercig vár a kapcsolatra. A Prisma 7-nél használt `connect_timeout` URL-paramétert a Prisma 8 nem veszi figyelembe, ezért nem kell (ha benne marad, nem árt).
- A két környezet között mindig a **teljes blokkot** kommentezd ki/be. Ha a `DIRECT_URL` a Neonra, a `DATABASE_URL` a helyi szerverre mutat, a migrációk a Neonra, a program a helyi adatbázisra kerül. Üres `DIRECT_URL=""` sor se maradjon, mert azt a config nem cseréli le a `DATABASE_URL`-re.

A Neon ingyenes csomagja (2026. szeptember): 100 projekt, projektenként 0,5 GB tárhely és havi 100 CU-óra számítási idő. Az adatbázis 5 perc tétlenség után leáll, és az első kérésre újraindul. A projekt nem szünetel véglegesen, mint a Supabase ingyenes projektjei.

A migrációkat helyben érdemes elkészíteni, és a Neonra csak alkalmazni (lásd 9. pont).

### 6.4 További népszerű (ingyenes csomaggal is elérhető) PostgreSQL szolgáltatások

| Szolgáltató                                       | Ingyenes keret (2026. szeptember)          | Megjegyzés                                                                      |
| ------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| [Neon](https://neon.com)                          | 100 projekt, 0,5 GB/projekt                | nem szünetel, adatbázis-ágak (branching), a Vercel is ezt kínálja               |
| [Prisma Postgres](https://www.prisma.io/postgres) | 50 adatbázis, 500 MB, havi 200 000 művelet | `npx create-db` egy ideiglenes adatbázist ad, a kiírt claim linkkel megtartható |
| [Supabase](https://supabase.com)                  | 2 aktív projekt, 500 MB                    | 1 hét tétlenség után szünetel, kézzel kell újraindítani                         |

Az árak és a korlátok gyakran változnak, nagyobb projekt kezdésekor érdemes ellenőrizni őket.

### 6.5 Supabase

1. Regisztráció a [supabase.com](https://supabase.com) oldalon (GitHub fiókkal is lehet), majd **New project**: add meg a projekt nevét, az adatbázis jelszavát (jegyezd fel, később nem látható!) és a régiót (pl. `Central EU (Frankfurt)`). A projekt a `postgres` nevű adatbázist kapja.
2. A projektben a felső sávban a **Connect** gombbal nyílik meg a connection string. A **Connection String** fülön a **Method** listából választható a kapcsolat típusa.
3. A `.env`-be két pooler cím kerüljön: a program a **Transaction pooler**-t (port `6543`, sok rövid kapcsolathoz), a Prisma CLI (migrációk, `contract infer`) a **Session pooler**-t (port `5432`) használja:

```
# --- Supabase ---
DATABASE_URL="postgresql://postgres.<PROJEKT-AZONOSÍTÓ>:<JELSZÓ>@aws-0-<RÉGIÓ>.pooler.supabase.com:6543/postgres?uselibpqcompat=true&sslmode=require"
DIRECT_URL="postgresql://postgres.<PROJEKT-AZONOSÍTÓ>:<JELSZÓ>@aws-0-<RÉGIÓ>.pooler.supabase.com:5432/postgres?uselibpqcompat=true&sslmode=require"
```

- A `<PROJEKT-AZONOSÍTÓ>`, a `<JELSZÓ>` és a `<RÉGIÓ>` helyére a Connect ablakból másolt értékek kerülnek (a felhasználónév `postgres.` + a projekt azonosítója). A pontos hostnevet mindig onnan másold, mert projektenként eltérhet.
- **Ne a direkt kapcsolatot használd** (`db.<projekt-azonosító>.supabase.co`): az ingyenes csomagban ez csak IPv6-on érhető el, ami sok iskolai és otthoni hálózaton nem működik (a hiba ilyenkor pl. `getaddrinfo ENOTFOUND` vagy `ENETUNREACH`). A Session pooler ugyanazt tudja, és IPv4-en is elérhető.
- **SSL:** a Supabase az adatbázis tanúsítványát a saját gyökértanúsítványával (CA) írja alá, amelyet a Node.js nem ismer. Ezért a `sslmode=verify-full` (és a `pg` driverben vele egyenértékű `sslmode=require`) ezzel a hibával áll le: `self-signed certificate in certificate chain` (`SELF_SIGNED_CERT_IN_CHAIN`). Két megoldás:

  | Paraméter                                             | Titkosít? | Ellenőrzi a tanúsítványt? |
  | ----------------------------------------------------- | --------- | ------------------------- |
  | `uselibpqcompat=true&sslmode=require` (a fenti minta) | igen      | nem                       |
  | `sslmode=verify-full&sslrootcert=supabase-ca.crt`     | igen      | igen, a Supabase CA-jával |

  A második, biztonságosabb változathoz a Supabase Dashboardon: **Project Settings → Database → SSL Configuration → Download certificate**. A letöltött fájl (jellemzően `prod-ca-2021.crt`) nevezd át `supabase-ca.crt`-re, és másold a **projekt gyökerébe**, a `package.json` és a `.env` mellé:

  ```
  next-backend-starter8\
  ├─ app\
  ├─ prisma\
  ├─ .env
  ├─ package.json
  └─ supabase-ca.crt
  ```

  A `pg` driver a `sslrootcert` útvonalát az aktuális mappához képest olvassa be. Az `npm run ...` scriptek, a `npx prisma ...` parancsok és az `npm run dev` a projekt gyökeréből futnak, ezért ott elég a fájlnév. Más mappából indítva teljes útvonal kell, perjellel: `sslrootcert=E:/.../next-backend-starter8/supabase-ca.crt`.

  A tanúsítvány nyilvános, nem titkos adat, de mivel a Supabase-hez tartozik, és nem mindenki használ Supabase-t, a sablon `.gitignore`-ja kizárja (`/supabase-ca.crt`), így mindenki a saját példányát tölti le. A Neonnál és a Prisma Postgresnél erre nincs szükség, ott a `sslmode=verify-full` működik.

- Az adatbázis eleve létezik, ezért a táblák létrehozásához elég: `npm run db:init`, majd `npm run db:seed`.

**Szünetelés:** az ingyenes Supabase-projekt **1 hét tétlenség után szünetel** Ilyenkor a kapcsolódás hibát ad; a Supabase Dashboardon a projektnél a **Restore project** gombbal indítható újra (pár perc). Az ingyenes csomagban nincs automatikus mentés.

Az adatok a Supabase Dashboard **Table Editor** és **SQL Editor** nézetében is kezelhetők.

**Sorszintű biztonság (RLS):** a Supabase az új táblákon automatikusan bekapcsolja az RLS-t, mert a `public` séma táblái a Supabase Data API-n (a nyilvános `anon` kulccsal) is elérhetők, és RLS nélkül bárki olvashatná, módosíthatná őket. Ezért a sablon contractjában minden modellen ott a `@@rls` (7. pont). Szabályok (policy) nélkül a Data API felől minden tiltva van, a mi alkalmazásunk viszont a táblák tulajdonosaként csatlakozik, így neki minden megengedett. Ha a contractból hiányzik a `@@rls`, a `db init` ezzel a hibával áll le:

```
✘ [MIGRATION.PLANNING_FAILED] Migration planning failed
  why: Operation "Disable row-level security on "films"" requires class "widening", but policy allows only: additive
```

Megoldás: a modellekre `@@rls` (a sablonban már benne van), majd `npm run contract:emit` és újra `npm run db:setup` (vagy ha a táblák már léteznek: `npm run db:init`). Az RLS-t **ne kapcsold ki** a Supabase-en (és a `db update`-tel se), mert akkor a táblák a nyilvános kulccsal elérhetővé válnak.

## 7. Prisma contract létrehozása (minta modellek) ./prisma/contract.prisma

Három minta modell: `User` és `Post` (egy-a-többhöz kapcsolattal: egy felhasználónak több bejegyzése lehet), valamint a kapcsolat nélküli `Film`. Az `orm init` a `User` és `Post` modellt szöveges dátumtípusokkal hozza létre, ezeket írd át a `JsDate`-es típusokra, hogy mindhárom modellben egyformán `Date` objektumként kapd a dátumokat:

```prisma
// use prisma-8

model User {
  id        Int               @id @default(autoincrement())
  email     String            @unique
  username  String?
  name      String?
  posts     Post[]
  createdAt TimestamptzJsDate @default(now()) @map("created_at")
  updatedAt TimestamptzJsDate @onCreate(now()) @onUpdate(now()) @map("updated_at")

  @@map("users")
  @@rls
}

model Post {
  id        Int               @id @default(autoincrement())
  title     String
  content   String?
  author    User              @relation(fields: [authorId], references: [id])
  authorId  Int               @map("author_id")
  createdAt TimestamptzJsDate @default(now()) @map("created_at")
  updatedAt TimestamptzJsDate @onCreate(now()) @onUpdate(now()) @map("updated_at")

  @@map("posts")
  @@rls
}

model Film {
  id        Int               @id @default(autoincrement())
  title     String            @unique
  content   String
  createdAt TimestamptzJsDate @default(now()) @map("created_at")
  updatedAt TimestamptzJsDate @onCreate(now()) @onUpdate(now()) @map("updated_at")

  @@map("films")
  @@rls
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
- A `@@rls` bekapcsolja a táblán a sorszintű biztonságot (row-level security, RLS). Szabály (policy) nélkül ez mindent tilt az olyan felhasználóknak, akik nem a tábla tulajdonosai; a mi alkalmazásunk a táblák tulajdonosaként (azzal a felhasználóval, amelyik a `db init`-tel létrehozta őket) csatlakozik, rá az RLS nem vonatkozik, így a programban nem okoz változást. A **Supabase** miatt kell: ott az új táblákon az RLS automatikusan bekapcsol, és `@@rls` nélkül a `db init` ki akarná kapcsolni (`MIGRATION.PLANNING_FAILED ... Disable row-level security`), lásd 6.5. Helyi szerveren és Neonon sem árt. Ha egy már meglévő (korábban `@@rls` nélkül létrehozott) adatbázist használsz, futtasd le egyszer a `npm run db:update`-et: ez csak bekapcsolja az RLS-t a táblákon, az adatokhoz nem nyúl.
- A `@map("created_at")` az oszlop nevét adja meg: a kódban a mező `createdAt` (camelCase), az adatbázisban az oszlop `created_at` (snake_case). `@map` nélkül az oszlop neve is `createdAt` lenne, amit a PostgreSQL-ben minden kézzel írt SQL-ben idézőjelbe kellene tenni (`SELECT "createdAt" FROM users`), mert az idézőjel nélküli neveket kisbetűsre alakítja. A `snake_case` oszlopnév idézőjel nélkül is működik, és a `contract infer` is ezt a párosítást adja vissza.
- Egy már meglévő adatbázisban az oszlop átnevezését (`@map` hozzáadása vagy módosítása) a Prisma nem ismeri fel átnevezésként: a `db update` törölné a régi oszlopot és újat hozna létre, az adatok elvesznének. A sablonnál ilyenkor egyszerűbb a táblákat törölni (pl. pgAdminban: `DROP TABLE posts, users, films;`), majd `npm run db:setup`: a `db init` újra létrehozza a táblákat és felülírja a régi aláírást, a seed pedig újratölti az adatokat.

**Dátumtípusok.** A dátumokhoz a `JsDate` végű típusokat használjuk, ezek JavaScript `Date` objektumként érkeznek, a JSON válaszban pedig ISO dátumszövegként (pl. `"2026-09-27T15:15:29.257Z"`) jelennek meg:

| Contract típus                                        | PostgreSQL oszlop          | Mikor kap értéket?                                                |
| ----------------------------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| `TimestamptzJsDate @default(now())`                   | `timestamptz`              | létrehozáskor, az adatbázis órája szerint                         |
| `TimestamptzJsDate @onCreate(now())`                  | `timestamptz`              | létrehozáskor, az alkalmazás órája szerint                        |
| `TimestamptzJsDate @onCreate(now()) @onUpdate(now())` | `timestamptz`              | létrehozáskor és minden módosításkor, az alkalmazás órája szerint |
| `TimestamptzJsDate?`                                  | `timestamptz`              | amikor megadod (opcionális dátum)                                 |
| `TimestamptzString`, `TimestampString`                | `timestamptz`, `timestamp` | amikor megadod; a kódban szövegként (pl. `"2026-09-27 17:12:19"`) |

> [!NOTE]
> Az automatikusan kitöltött dátummezők írásmódja a Prisma 8 RC-i között többször változott. Egy régebbi contractban az alábbi alakok is előfordulhatnak, ezeket az rc.22 már nem fogadja el (`PSL_UNRESOLVED_REFERENCE ... Prisma 8 removed field presets`), az új alakra kell cserélni:
>
> | Régi alak                                                                      | rc.22-től                                             |
> | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
> | `temporal.updatedAtJsDate()` (rc.12–17), `temporal.UpdatedAtJsDate` (rc.20–21) | `TimestamptzJsDate @onCreate(now()) @onUpdate(now())` |
> | `temporal.createdAtJsDate()`                                                   | `TimestamptzJsDate @onCreate(now())`                  |

> Ha MySQL-ből érkezel: a két adatbázis legfontosabb különbségei (idézőjelek, típusok, SQL írásmód, sorozatok, hibakódok): [mysql-vs-postgresql.md](mysql-vs-postgresql.md).

> Részletes összefoglaló a dátum- és időtípusokról (PostgreSQL, Prisma 8, TypeScript, JSON, időzónák, írás és szűrés): [DATE-TIME.md](DATE-TIME.md).

**Rövid alakok (rc.22-től).** A `DateTime` és a `Date` úgynevezett kényelmi (convenience) típus, amely a paramétereiből választ konkrét típust:

| Rövid alak               | Ugyanaz, mint          | PostgreSQL oszlop                               | A kódban                |
| ------------------------ | ---------------------- | ----------------------------------------------- | ----------------------- |
| `DateTime`               | `TimestamptzJsDate(3)` | `timestamptz(3)` (ezredmásodperc)               | `Date` objektum         |
| `DateTime(precision: 6)` | `TimestamptzJsDate`    | `timestamptz` (6, a PostgreSQL alapértelmezése) | `Date` objektum         |
| `DateTime(as: string)`   | `TimestamptzString`    | `timestamptz`                                   | szöveg                  |
| `Date`                   | `DateString`           | `date`                                          | szöveg (`"2026-09-27"`) |

A `contract infer` is ezeket a rövid alakokat írja (`Date`, `DateTime(precision: 6)`), ezek átírás nélkül használhatók. A sablon a beszédesebb `TimestamptzJsDate` alakot használja; a `DateTime` magában `timestamptz(3)` oszlopot jelent, ezért egy már létező adatbázisnál a kettő nem cserélhető fel migráció nélkül.

A `Temporal` végű típusok (`TimestamptzTemporal`, `DateTemporal`, `DateTime(as: temporal)`) a JavaScript új `Temporal` API-ját használják, amely csak a Node.js 26-tól beépített. Node.js 24-en az ilyen mezők olvasása `RUNTIME.TEMPORAL_UNAVAILABLE` hibával leáll, ezért ezeket ne használd. A régebbi RC-k végződés nélküli `Timestamptz` és `Timestamp` típusa megszűnt (`PSL_UNRESOLVED_REFERENCE`).

**`VarChar` mezők írása.** Ha a modellben pl. `nev VarChar(100)` szerepel, egy `string` értékre a TypeScript ezt a hibát adja: `Type 'string' is not assignable to type 'Varchar<100>'`. Megoldás:

```ts
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

await db.orm.public.Rendezo.create({ nev: "Fábri Zoltán" as Varchar<100> });
```

A hossz ellenőrzését ez nem kapcsolja ki: a túl hosszú szöveget az adatbázis `22001`-es hibával (`value too long for type character varying(100)`) utasítja el. A `request.json()`-ból érkező értékeknél a hiba nem jön elő, mert azok típusa `any`.

majd (a szerver fusson, és az adatbázis létezzen, lásd 6. pont):

> npx prisma contract emit<br>
> npx prisma db init<br>

A `db init` új adatbázison létrehozza a hiányzó táblákat (csak hozzáad, nem töröl), majd "aláírja" az adatbázist: egy jelölőt (marker) ír bele, amelyből a Prisma tudja, melyik contract-verziónak felel meg. Emellett létrehozza a `migrations/app/refs/db.json` hivatkozást és a `migrations/snapshots` mappát, ezeket commitolni kell.

**Egy paranccsal:** üres (de már létező) adatbázison a három lépés (`contract emit`, `db init`, `seed`) együtt is futtatható:

> npm run db:setup<br>

Az első feltöltéshez való. A `db init` csak hozzáad, a már meglévő, kompatibilis táblákat békén hagyja, így újrafuttatni nem káros, de a seed minden futáskor törli és újratölti a táblák tartalmát. Ha csak az adatok kellenek újra, elég a `npm run db:seed`, séma-változásnál pedig a `db:update` vagy a migrációk (9. pont).

## 8. A contract a meglévő adatbázistáblákból is létrehozható

> npx prisma contract infer --output ./prisma/contract.prisma<br>

A parancs felülírja a megadott contractot. A Prisma 7-es `db pull`-hoz képest sokkal olvashatóbb eredményt ad:

- a modellek PascalCase nevet kapnak (`konyvek` tábla → `model Konyvek` + `@@map("konyvek")`),
- a mezők camelCase nevet (`szerzo_id` oszlop → `szerzoId` + `@map("szerzo_id")`),
- a `CHECK` megszorítások is bekerülnek (`@@check(...)`),
- a megszorítások és indexek adatbázisbeli neve `map: "..."` alakban kerül be (pl. `@id(map: "konyvek_pkey")`, `@@index([szerzoId], map: "konyvek_szerzo_id_idx")`). Az infer ezeket mindig kiírja (nem állítható be), és **ne töröld őket**: az index nélkülük más (hash-elt) nevet kapna, a `@@check` pedig név nélkül le sem fordul, így a `db sign` hibát adna,
- az elsődleges kulcs nélküli táblákat `// WARNING: This table has no primary key in the database` megjegyzés jelzi (ilyenkor adj a táblának elsődleges kulcsot).

Átnézés után (modellnevek egyes számba: `Konyvek` → `Konyv`, a `@@map` maradjon!):

> npx prisma contract emit<br>
> npx prisma db sign<br>

A `db sign` ellenőrzi, hogy az adatbázis megfelel-e a contractnak, és aláírja (a táblák nem változnak). Ezután a migrációk a 9. pont szerint működnek.

**Scriptekkel:** a két lépés a `package.json` scriptjeivel is futtatható, a kettő között a contract átnézése és javítása következik:

> npm run db:infer1<br>
> npm run db:infer2<br>

| Script      | Mit futtat?                                                   |
| ----------- | ------------------------------------------------------------- |
| `db:infer1` | `npx prisma contract infer --output ./prisma/contract.prisma` |
| `db:infer2` | `npx prisma contract emit && npx prisma db sign`              |

Figyelj a típusokra, mielőtt emitálsz:

- A `timestamptz` oszlopok `DateTime(precision: 6)`, a `date` oszlopok `Date` típust kapnak: ezek Node.js 24-en is jók (`Date` objektum, illetve szöveg), nem kell átírni őket (7. pont, rövid alakok).
- A `timestamp` (időzóna nélküli) oszlopok `DateTime(storage: timestamp, precision: 6)` típust kapnak, a kódban `Date` objektumként; ha szövegként kell, írd át `TimestampString`-re (az oszlop típusa ugyanaz marad), vagy alakítsd az oszlopot `timestamptz`-re. A `time` oszlop `Time` típust kap (szöveg).
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

## 10. contract emit, db update, db sign - mikor melyiket?

Ez a három parancs a leggyakoribb, és könnyű összekeverni őket. Röviden: az **emit** a fájlokat frissíti, az **update** az adatbázist igazítja a contracthoz, a **sign** az adatbázison semmit nem változtat, csak rögzíti, hogy megfelel a contractnak.

| Parancs                | Mit csinál?                                                                                                                | Kell hozzá adatbázis? | Módosítja az adatbázist?                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------- |
| `prisma contract emit` | a `contract.prisma`-ból elkészíti a `contract.json` és `contract.d.ts` fájlt (a kód és a TypeScript ezeket használja)      | nem                   | nem                                           |
| `prisma db update`     | összeveti az adatbázist a contracttal, a különbséget végrehajtja (tábla, oszlop, index létrehozása, törlése), majd aláírja | igen                  | **igen** (adatvesztés előtt megerősítést kér) |
| `prisma db sign`       | ellenőrzi, hogy az adatbázis megfelel-e a contractnak; ha igen, aláírja (a jelölőt frissíti)                               | igen                  | nem (csak a jelölőt írja)                     |

### Az összes parancs röviden

Négy fogalom kell hozzájuk:

- **contract:** az adatmodell leírása (`prisma/contract.prisma`). Ez az igazság forrása: a modellek, mezők, típusok, kapcsolatok.
- **aláírás (marker):** egy jelölő az **adatbázisban**, amely rögzíti, melyik contract-verziónak felel meg az adatbázis. Futáskor a Prisma ebből tudja, hogy a kód és az adatbázis összeillik.
- **migráció:** egy mentett, commitolható lépés (`migrations/app` mappa), amely leírja, hogyan jut el az adatbázis a contract egyik változatáról a következőre.
- **`db` hivatkozás (ref):** a `migrations/app/refs/db.json` fájl. Azt jegyzi, hogy a fejlesztői adatbázis a contract melyik változatánál tart, a következő `migration plan` innen indul.

| Parancs                                                       | Röviden                                                               | Csatlakozik az adatbázishoz? | Módosítja az adatbázist?               |
| ------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------- | -------------------------------------- |
| `npx prisma contract infer --output ./prisma/contract.prisma` | a meglévő adatbázisból contract-fájlt készít                          | igen                         | nem (a `contract.prisma`-t írja felül) |
| `npx prisma contract emit`                                    | a contractból elkészíti a kód által használt fájlokat                 | nem                          | nem                                    |
| `npx prisma db init`                                          | új adatbázison létrehozza a hiányzó táblákat, és aláírja              | igen                         | igen (csak hozzáad)                    |
| `npx prisma db update`                                        | az adatbázist a contracthoz igazítja, migrációs fájl nélkül           | igen                         | igen (törölhet is)                     |
| `npx prisma db verify`                                        | ellenőrzi, hogy az adatbázis megfelel-e a contractnak                 | igen                         | nem                                    |
| `npx prisma db sign`                                          | ellenőrzi, majd aláírja az adatbázist (a táblákhoz nem nyúl)          | igen                         | csak az aláírást írja                  |
| `npx prisma migration plan`                                   | a contract változásából migrációt készít                              | nem                          | nem (csak fájlokat ír)                 |
| `npx prisma migration status`                                 | megmutatja, mely migrációk várnak még végrehajtásra                   | igen                         | nem                                    |
| `npx prisma db migrate --advance-ref db`                      | végrehajtja a várakozó migrációkat, és előreléptet a `db` hivatkozást | igen                         | igen                                   |

**`npx prisma contract infer --output ./prisma/contract.prisma`**
Beolvassa a **meglévő adatbázis** tényleges sémáját, és abból elkészíti a `contract.prisma` fájlt, vagyis fordított irányban dolgozik, mint a többi parancs: nem a contract alapján alakítja az adatbázist, hanem az adatbázis alapján írja meg a contractot. Akkor kell, ha már létező táblákkal kezdesz (pl. egy korábbi projektből). Az `--output` a kimeneti fájl útvonala; ha a fájl már létezik, a parancs figyelmeztetéssel **felülírja**, ezért előbb mentsd vagy commitold a saját contractodat. A parancs itt megáll: a kapott fájlt át kell nézni (típusok, modellnevek, lásd 8. pont), majd külön lépésként jön a `contract emit` és a `db sign`. Az adatbázist nem módosítja.

**`npx prisma contract emit`**
Beolvassa a `contract.prisma` fájlt, és két fájlt ír a `prisma` mappába: a `contract.json`-t (a contract géppel olvasható változata, ezt használja a futó kód és a többi parancs) és a `contract.d.ts`-t (a TypeScript típusai, ezért kapsz automatikus kiegészítést a `db.orm...` hívásoknál). Az adatbázist nem érinti, ezért bármikor biztonságosan futtatható. Minden contract-módosítás után ezzel kezdj, mert a többi parancs a `contract.prisma`-t nem olvassa, csak az emitált fájlt.

**`npx prisma db init`**
Új adatbázis előkészítése. Mindazt létrehozza, amit a contract leír, de az adatbázisban még nincs (táblák, oszlopok, indexek), majd aláírja az adatbázist. Csak hozzáad, soha nem töröl: ha egy tábla már létezik és kompatibilis, békén hagyja; ha ütközést talál, amelyet csak törléssel lehetne feloldani, leáll. Létrehozza a `migrations/app/refs/db.json` hivatkozást és a `migrations/snapshots` mappát is. Előtte megnézheted, mit tenne: `npx prisma db init --dry-run`.

**`npx prisma db update`**
Összeveti az adatbázist a contracttal, és végrehajtja a különbséget: új tábla, oszlop, index létrehozását, de törlését is. Migrációs fájlt nem készít, ezért fejlesztés közben a leggyorsabb, közös adatbázison viszont nem hagy nyomot. Ha egy művelet adatot veszítene (pl. oszlop törlése), nem fut le, amíg meg nem mondod, mit jelent: `--rename régi:új` (az adat megmarad az új néven) vagy `--delete` (az adat elvész). Előtte: `npx prisma db update --dry-run`.

**`npx prisma db verify`**
Csak olvas. Először az aláírást nézi meg, aztán azt, hogy a tényleges séma teljesíti-e a contractot. Eltérésnél hibakóddal tér vissza (4 = eltérés, 2 = nem tudott lefutni, pl. nincs kapcsolat). Hasznos kapcsolók: `--marker-only` (csak az aláírás), `--schema-only` (csak a séma), `--strict` (az is hiba, ha az adatbázisban több van, mint a contractban).

**`npx prisma db sign`**
Ellenőrzi, hogy az adatbázis sémája megfelel a contractnak, és ha igen, aláírja. A táblákat nem változtatja, és újra futtatva sem árt (ismételhető). Akkor kell, ha az adatbázis már jó, csak a Prisma nem tud róla: meglévő adatbázis átvételekor vagy kézi SQL-módosítás után. Ha az adatbázisból hiányzik valami, hibát ad, nem ír alá. Aláíráskor a `db` hivatkozást is előreviszi; `--no-advance-ref` kapcsolóval ez kihagyható.

**`npx prisma migration plan`**
Összeveti az emitált contractot a legutóbbi migráció állapotával, és a különbségből új migrációt ír a `migrations/app` mappába (`--name valtozas_neve`: a mappa neve). Nem csatlakozik az adatbázishoz, és nem hajt végre semmit, csak elkészíti a lépést, amit utána átnézhetsz és commitolhatsz. Üres `migrations` mappánál először egy `baseline` migrációt készít a `db` hivatkozás állapotából. Adatvesztő változásnál megkérdezi, mit jelent (`--rename`, `--delete`); típusváltozásnál vagy új kötelező mezőnél a `--convert` és a `--backfill` kapcsolóval a migrációba kód írható az adatok átalakításához.

**`npx prisma migration status`**
Megmutatja, hogy az adatbázis aláírása és a célként megadott contract között mely migrációk várnak még végrehajtásra, vagyis hol tart az adatbázis. Csak olvas.

**`npx prisma db migrate --advance-ref db`**
A várakozó migrációkat sorrendben végrehajtja az adatbázison. A már lemezen lévő migrációkat játssza vissza, magától nem talál ki újat. Siker után az `--advance-ref db` a `db` hivatkozást az új állapotra állítja, így a következő `migration plan` onnan indul. Más adatbázison (pl. Neonon) a migrációkat **`--advance-ref` nélkül** alkalmazd, mert az a `db` hivatkozás a fejlesztői adatbázishoz tartozik. Előtte megnézheted az útvonalat: `npx prisma db migrate --show`.

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
[error] missing: database/public/films/column:hossz
[error] CONTRACT.SCHEMA_VERIFICATION_FAILED: Database schema does not satisfy contract (1 failure)
```

Ilyenkor a `db update` kell. Ha fordítva, az adatbázisban van több (pl. egy oszlop, amit a contract nem ismer), a `db sign` elfogadja.

### Tipikus sorrendek

| Helyzet                                                        | Parancsok                                                                                          |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| új, üres adatbázis                                             | `prisma contract emit` → `prisma db init`                                                          |
| új mező / modell, fejlesztés közben                            | `prisma contract emit` → `prisma db update`                                                        |
| új mező / modell, migrációval                                  | `prisma contract emit` → `prisma migration plan --name ...` → `prisma db migrate --advance-ref db` |
| csak a kódbeli típus változott (pl. `...String` → `...JsDate`) | `prisma contract emit` → `prisma db update` (0 művelet, új aláírás)                                |
| meglévő adatbázis átvétele                                     | `prisma contract infer ...` → (átnézés) → `prisma contract emit` → `prisma db sign`                |
| kézi SQL módosítás után                                        | contract módosítása → `prisma contract emit` → `prisma db sign`                                    |
| sablon klónozása után (a `migrations` mappa nélkül)            | `npm install` → `.env` → üres adatbázison `prisma db init`                                         |
| ellenőrzés                                                     | `prisma db verify`                                                                                 |

## 11. Minta adatok feltöltése (seed) ./prisma/seed.ts

A Prisma 8-ban a kapcsolódó rekordok egy lépésben (beágyazva) még nem hozhatók létre (`posts: { create: [...] }` → `ORM.COLUMN_UNKNOWN` hiba). Előbb a hivatkozott rekordot (a felhasználót) kell létrehozni, utána a hivatkozókat (a bejegyzéseket) az idegen kulccsal (`authorId`).

```ts
import { db } from "./db";

async function main() {
  // minden tábla kiürítése, és az id sorozatok visszaállítása 1-re (nyers SQL, táblanevekkel)
  await db.query(
    db.raw.sql`TRUNCATE TABLE posts, users, films RESTART IDENTITY`.affectedCount().build(),
  );

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

**Miért `TRUNCATE` és nem `deleteAll()`?** A `.where({}).deleteAll()` csak a sorokat törli, az `id` sorozat (sequence) ott folytatódik, ahol abbahagyta: a második seed után a filmek id-je már 19–36 lenne, és a `/api/films/1` 404-et adna. A `TRUNCATE ... RESTART IDENTITY` egyszerre üríti ki a táblákat és állítja vissza az id-ket 1-re. Mivel nyers SQL, az adatbázisbeli táblaneveket (`posts`, `users`, `films`) kell használni, és mindhárom táblát egy utasításban kell megadni, mert a `posts` hivatkozik a `users` táblára (külön-külön a `users` kiürítése idegen kulcs hibát adna).

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

| Prisma 7                                 | Prisma 8                                                           |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `prisma.film.findMany()`                 | `db.orm.public.Film.all()`                                         |
| `findMany({ where: { ev: 1968 } })`      | `db.orm.public.Film.where({ ev: 1968 }).all()`                     |
| `findUnique({ where: { id } })`          | `db.orm.public.Film.where({ id }).first()` (nincs találat: `null`) |
| `orderBy: { title: "asc" }`              | `.orderBy((f) => f.title.asc())`                                   |
| `take` / `skip`                          | `.limit(n)` / `.offset(n)`                                         |
| `select: { title: true }`                | `.select("id", "title")`                                           |
| `include: { mufaj: true }`               | `.include("mufaj")`                                                |
| `where: { title: { contains: "egri" } }` | `.where((f) => f.title.like("%egri%"))`                            |
| `create({ data: {...} })`                | `db.orm.public.Film.create({ ... })` (nincs `data:` csomagolás)    |
| `createMany({ data: [...] })`            | `db.orm.public.Film.createAll([...])`                              |
| `update({ where: { id }, data: {...} })` | `db.orm.public.Film.where({ id }).update({ ... })`                 |
| `delete({ where: { id } })`              | `db.orm.public.Film.where({ id }).delete()`                        |
| `updateMany` / `deleteMany`              | `.where(...).updateAll({ ... })` / `.where(...).deleteAll()`       |
| `count()`                                | `.aggregate((a) => ({ db: a.count() }))`                           |
| hiba `P2002` (egyedi érték ütközés)      | `sqlState === "23505"`                                             |
| hiba `P2003` (idegen kulcs)              | `sqlState === "23503"`                                             |
| hiba `P2025` (nincs ilyen rekord)        | az `update` / `delete` `null`-t ad vissza                          |

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
  npx prisma@7 studio --url "postgresql://postgres:jelszo@localhost:5432/mydb"
  ```
  (böngészőben: `http://localhost:5555`)
- **pgAdmin 4:** a PostgreSQL telepítővel és a zip csomaggal is érkezik
- **dbForge Studio for PostgreSQL:** ingyenes Express kiadás, a 2026.1-es verziótól Visual Query Builderrel
- **DBeaver Community:** ingyenes, sokféle adatbázist kezel
- **VS Code PostgreSQL bővítmény** (Microsoft, `ms-ossdata.vscode-pgsql`): táblák böngészése, SQL futtatás a VS Code-ban
- **Neon Console:** a Neon webes felületén SQL Editor és Tables nézet
- **Supabase Dashboard:** a Supabase webes felületén Table Editor és SQL Editor
- **psql:** parancssori kliens, pl. `psql -h localhost -U postgres -d mydb`

## 14. Hasznos trükkök, buktatók

- **A mentés után nem frissül az API (a hot reload "befagy"):** ellenőrizd sorban:
  1. **Contract változás után az új mezők/modellek nem látszanak:** a `prisma/db.ts` a régi klienst tartja meg. Az 5. pontban lévő változat a contract változásakor új klienst készít; régebbi `db.ts` esetén indítsd újra a fejlesztői szervert.
  2. **Debug módban vagy?** Ha a futás egy törésponton áll (Debug server-side), a szerver nem válaszol és nem fordít újra, amíg nem folytatod (F5).
  3. **Windows Defender:** a valós idejű víruskeresés minden fájlolvasást ellenőriz, ami nagyon lelassíthatja az újrafordítást (a Next.js dokumentációja is jelzi). A projekt mappáját (vagy legalább a `.next` mappát) érdemes kivételként felvenni: **Windows Biztonság → Vírus- és veszélyvédelem → Beállítások kezelése → Kizárások**.
  4. **Sérült Turbopack gyorsítótár:** a Next.js 16 a fejlesztői fordítás eredményét a `.next/dev/cache/turbopack` mappába menti. Ha ez összeakad, a fejlesztői szerver leállítása után töröld a `.next` mappát, majd indítsd újra (`npm run dev`). Ha gyakran előfordul, a gyorsítótár kikapcsolható a `next.config.ts`-ben (ára: lassabb első indulás):
     ```ts
     const nextConfig: NextConfig = {
       experimental: {
         turbopackFileSystemCacheForDev: false,
       },
     };
     ```
- **`'prisma' is not recognized as an internal or external command`:** a Prisma CLI a projekt fejlesztői függősége, ezért `npx prisma ...` alakban (vagy `npm run ...` scripttel) kell futtatni.
- **Nincs IntelliSense és formázás a `contract.prisma`-ban:** a VS Code Prisma bővítménye a projekt `node_modules/prisma` mappájából indítja a Prisma 8 nyelvi szervert. Ellenőrizd, hogy le van-e futtatva az `npm install`, és hogy a contract első sora `// use prisma-8`, majd a VS Code-ban: **Ctrl+Shift+P → Developer: Reload Window**.
- **`CLI.CONFIG_UNREADABLE ... config loading resolved E:/... instead of e:\...`:** a parancssor (`cmd`) kisbetűs meghajtójellel áll a mappában. Futtasd a parancsot PowerShellből (2.1 pont), vagy lépj be újra nagybetűvel: `cd /d E:\...`.
- **`Cannot find module 'prisma/config'`:** a `prisma.config.ts`-ben a `definePrismaConfig`-et a `@prisma/cli-engine` csomagból kell importálni (3. pont).
- **`Cannot find module '.../prisma/contract.json'`:** elmaradt a `prisma contract emit`. A contract minden módosítása után futtatni kell, különben a TypeScript sem látja az új mezőket (a VS Code-ban néha **TypeScript: Restart TS Server** is kell).
- **`MIGRATION.PLANNING_FAILED` … `Disable row-level security on "..." requires class "widening"`** (Supabase): a táblákon be van kapcsolva az RLS, a contractban nincs. Megoldás: `@@rls` a modellekre, lásd 6.5.
- **`CONTRACT.MARKER_READ_FAILED` … `unsupported startup parameter in options: lc_monetary`** (Neon, a program vagy a seed futásakor): a `DATABASE_URL` a pooled (`-pooler`) címre mutat. A Prisma 8 rc.23 olyan kapcsolódási beállítást küld, amelyet a pooler nem fogad el; használd a direkt címet (6.3). Ha más szolgáltatónál (pl. a Supabase Transaction poolerével) jön ugyanez, ott is a pooler nélküli, illetve Session módú címet kell a `DATABASE_URL`-be írni.
- **`RUNTIME.TEMPORAL_UNAVAILABLE`:** a contractban `Temporal` dátumtípus (`TimestamptzTemporal`, `DateTemporal`, `DateTime(as: temporal)`) szerepel, lásd 7. pont.
- **`CLI.UNEXPECTED: Cannot use 'in' operator to search for 'kind' in typeChoice`:** a `prisma` CLI és az `@prisma/orm-postgres` eltérő belső verziót használ. Megoldás: a `package.json` `overrides` bejegyzése (2.4 pont), majd `npm install`.
- **`PSL_UNRESOLVED_REFERENCE ... was a field preset, and Prisma 8 removed field presets`:** a contractban régi írásmódú dátummező van (`temporal.updatedAtJsDate()`, `temporal.UpdatedAtJsDate`), a hibaüzenet megmondja az új alakot (7. pont).
- **`DRIVER.CONNECTION_FAILED`:** nem fut a szerver, hibás a `.env`-ben a connection string, vagy nem létezik az adatbázis (a Prisma 8 nem hozza létre). A `why:` sor mondja meg a pontos okot:
  - `password authentication failed for user '...'`: rossz a jelszó, vagy (Neonon) a hostnévben helyőrző maradt (6.3 pont),
  - `database "..." does not exist`: nincs létrehozva az adatbázis, vagy kimaradt az URL-ből az adatbázisnév (`/neondb`, `/mydb`).
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
