# Migrációk a Prisma 8-ban – tanulói segédlet

Ez a segédlet röviden elmagyarázza, mi a migráció, hogyan működik a Prisma 8-ban, és mikor melyik parancsot kell használni. A példák a sablon `Author` / `Article` modelljére épülnek, a kimenetek valódi futtatásból származnak (`prisma@8.0.0-rc.35`).

## 1. Mi a migráció?

A **migráció** az adatbázis _szerkezetének_ egy mentett, visszajátszható változtatása: például „adj hozzá egy `views` oszlopot az `article` táblához”. Olyan, mint egy git commit, csak az adatbázis sémájára.

Miért jó?

- **Nyoma marad:** a `migrations` mappában látszik, mikor és mi változott, és a git-be is bekerül.
- **Megismételhető:** ugyanazok a lépések egy másik adatbázison (pl. a társad gépén, Neonon vagy az éles szerveren) ugyanúgy lefutnak.
- **Átnézhető:** a végrehajtás előtt látod a futtatandó SQL-t.

## 2. Két út a contracttól az adatbázisig

Ha megváltoztatod a `prisma/contract.prisma`-t, az adatbázist kétféleképpen igazíthatod hozzá:

|                         | Gyors út: `db update`                     | Migrációs út: `migration plan` + `db migrate`        |
| ----------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Mit csinál?             | közvetlenül átírja az adatbázist          | előbb egy migrációs fájlt ír, aztán azt hajtja végre |
| Marad nyoma?            | nem                                       | igen, a `migrations/app` mappában                    |
| Másik adatbázison?      | ott újra ki kell találnia a különbséget   | ugyanazt a mentett lépést játssza vissza             |
| Adat átalakítása        | nem tud                                   | tud (pl. típusváltásnál, lásd 7. pont)               |
| Mikor?                  | kísérletezés a saját gyakorló adatbázison | közös vagy éles adatbázis, beadandó, csapatmunka     |
| Prisma 7-es megfelelője | `prisma db push`                          | `prisma migrate dev` / `prisma migrate deploy`       |

> [!IMPORTANT]
> Ha egy projektben már vannak migrációk, a sémát onnantól **csak migrációval** változtasd. A `db update` ugyanis nem ír migrációt, így az adatbázis olyan állapotba kerül, amelyhez a migrációk nem vezetnek el (lásd 10. pont).

## 3. A szereplők

```
prisma/contract.prisma ──contract emit──► prisma/contract.json      (a contract géppel olvasható változata)
                                               │
                                     migration plan (offline)
                                               ▼
                               migrations/app/<időbélyeg>_<név>/       (egy migrációs csomag)
                                               │
                                     db migrate (az adatbázison)
                                               ▼
                                     PostgreSQL + aláírás (marker)
```

- **contract** (`prisma/contract.prisma`): az adatmodell, ez az igazság forrása.
- **`contract emit`**: a contractból elkészíti a `contract.json`-t. A migrációs parancsok **ezt** olvassák, ezért minden contract-módosítás után ezzel kezdj.
- **aláírás (marker)**: egy sor az adatbázisban (`prisma_contract.marker` tábla), amely megmondja, hogy az adatbázis a contract melyik változatánál tart. A változatokat egy 64 jegyű **hash** azonosítja (pl. `c39d7dd…`), ezt a kimenetek gyakran rövidítve mutatják.
- **migrációs csomag**: egy mappa a `migrations/app` alatt, neve `<ÉÉÉÉHHNN>T<ÓÓPP>_<név>`, pl. `20261124T2042_add_views`. Három fájl van benne:
  - `migration.ts`: a lépések TypeScriptben (a Prisma generálja, olvasható),
  - `ops.json`: ugyanezek a lépések gépi formában (ezt hajtja végre a `db migrate`),
  - `migration.json`: honnan hova visz (`from` → `to` hash) és egy ellenőrző hash.
- **`db` ref** (`migrations/app/refs/db.json`): egy könyvjelző, amely azt jegyzi, hol tart a **fejlesztői** adatbázisod. A következő `migration plan` innen indul.
- **snapshotok** (`migrations/snapshots/<hash>/`): a contract korábbi változatai, ezekre hivatkoznak a migrációk.

A teljes `migrations` mappát (csomagok, `refs`, `snapshots`) **commitolni kell**.

## 4. A három npm script

```json
"migration:plan": "prisma migration plan",
"migration:status": "prisma migration status",
"migrate": "prisma db migrate --advance-ref db"
```

| Script                                   | Mit csinál?                                                      | Csatlakozik az adatbázishoz? | Módosítja az adatbázist? |
| ---------------------------------------- | ---------------------------------------------------------------- | ---------------------------- | ------------------------ |
| `npm run migration:plan -- --name <név>` | a contract változásából új migrációs csomagot ír                 | **nem**                      | nem (csak fájlokat ír)   |
| `npm run migration:status`               | megmutatja, mely migrációk várnak még végrehajtásra              | igen (az aláírást olvassa)   | nem                      |
| `npm run migrate`                        | végrehajtja a várakozó migrációkat, és előrelépteti a `db` refet | igen                         | **igen**                 |

**`migration plan`.** Összeveti az emitált contractot azzal az állapottal, ahol a `db` ref áll, és a különbségből egy új csomagot ír. Nem csatlakozik az adatbázishoz, nem futtat semmit, ezért bátran kipróbálhatod: ha nem tetszik az eredmény, töröld a létrejött mappát. A `--name` a mappanév vége; adj neki rövid, beszédes, kisbetűs nevet aláhúzással (`add_views`, `author_full_name`). Az `npm run` után a `--` kell, hogy a kapcsoló a Prismához jusson.

**`migration status`.** Az adatbázis aláírásából kiolvassa, hol tart, és kirajzolja a migrációk „útvonalát” a jelenlegi contractig. A még le nem futottakat `pending` jelöli.

**`db migrate --advance-ref db`.** Sorban lefuttatja a várakozó migrációkat. PostgreSQL-en az egész futás **egy tranzakció**: ha bármelyik lépés hibát ad, minden visszagördül, és az aláírás sem változik. Siker után a `db` refet az új állapotra állítja, így a következő `migration plan` onnan indul. Új lépést soha nem talál ki, csak a lemezen lévő csomagokat játssza vissza.

> A `db migrate` a fejlesztői gépen kapcsoló nélkül is előrelépteti a `db` refet, ha a kapcsolat a `prisma.config.ts`-ből (vagyis a `.env`-ből) jön. A `--advance-ref db` ezt akkor is kikényszeríti, ha a parancs `--db` kapcsolóval vagy CI-környezetben fut.

## 5. Egy teljes kör lépésről lépésre

Feladat: az `Article` modell kapjon egy `views` (megtekintések száma) mezőt.

**1. A contract módosítása** (`prisma/contract.prisma`):

```prisma
model Article {
  ...
  rating      Int?
  views       Int                @default(0)
  ...
}
```

**2. Emit és a migráció megtervezése:**

```powershell
npm run contract:emit
npm run migration:plan -- --name add_views
```

```
✔ Planned 1 operation(s)

migrations/app/20261124T2042_add_views
└─ Add column "views" to "article"

from:       c39d7ddd1c35fdcf103d409f8c9ec703b6b6f2f3e5a28a6fdd912da280b5178c
to:         b4dbd156586508e82f99a89236a41e31dadf8cd2e3ceacce22a95054e17ae1ba
app space:  migrations/app/20261124T2042_add_views

ℹ DDL preview

ALTER TABLE "public"."article" ADD COLUMN "views" int4 DEFAULT 0 NOT NULL;

→ Review migrations/app/20261124T2042_add_views
→ Apply the migration: prisma db migrate
```

**3. Átnézés.** Olvasd el a `DDL preview` részt: ez az SQL fog lefutni. A `from:` sor mutatja, honnan indul a migráció; ennek a `db` ref hash-ének kell lennie (lásd 10. pont). A csomag `migration.ts` fájlja ugyanezt mutatja TypeScriptben:

```ts
override get operations() {
  return [
    this.addColumn({
      schema: 'public',
      table: 'article',
      column: col('views', 'int4', { notNull: true, default: lit(0), codecRef: { codecId: 'pg/int4@1' } }),
    }),
  ];
}
```

**4. Mi vár végrehajtásra?**

```powershell
npm run migration:status
```

```
○   b4dbd15  @contract
│↑  20261124T2042_add_views  c39d7dd → b4dbd15  1 ops  ⧗ pending
○   c39d7dd  (db)
│↑  20261124T2042_init             ∅ → c39d7dd  6 ops
○   ∅

⚠ 1 pending — run `prisma db migrate --to b4dbd1565865`
```

Alulról felfelé olvasd: `∅` az üres adatbázis, `(db)` a `db` ref, `@contract` a jelenlegi contract. A `pending` csomag még nem futott le.

**5. Végrehajtás és ellenőrzés:**

```powershell
npm run migrate
npx prisma db verify
```

**6. Commit:** a contract módosítását és az új `migrations/app/20261124T2042_add_views` mappát együtt commitold, a `refs/db.json`-nal és az új snapshottal együtt.

## 6. Az első migráció (baseline)

Az első `migration plan` előtt a `migrations/app` mappában még nincs csomag. Ilyenkor a Prisma előbb egy **baseline** csomagot készít, amely az üres adatbázistól a `db` ref állapotáig vezet (minden tábla létrehozása), és csak utána a te változtatásodat. Ezért az első alkalommal **két** mappa jön létre:

```
✔ Planned baseline (6 operation(s)) + 1 operation(s)

migrations/app/20261124T2040_baseline
├─ Create schema "public"
├─ Create table "article"
├─ Create table "author"
...
migrations/app/20261124T2041_add_views
└─ Add column "views" to "article"
```

A saját adatbázisodon a baseline nem fut le újra: a `db migrate` az aláírásból látja, hogy az adatbázis már abban az állapotban van, és csak az új lépést hajtja végre. Egy üres adatbázison (pl. a társad gépén) viszont a baseline hozza létre a táblákat.

## 7. Ha adat veszhet el: törlés, átnevezés, típusváltás

A `migration plan` nem dönti el helyetted, hogy egy eltűnt mező törlés vagy átnevezés volt-e. Adatvesztés előtt mindig **megkérdezi**. A terminálban kérdést tesz fel, a kérdésekre a kapcsolókkal előre is válaszolhatsz.

**Példa:** az `Author` modellben a `name` mezőt `fullName`-re nevezted át (`@map("full_name")`), a `username` mezőt pedig törölted. Válasz nélkül a parancs leáll, és felsorolja a lehetőségeket:

```
✘ [CLI.CONSENT_REQUIRED] This command requires explicit consent, but it was not provided.
  why: Drop column "name" from "author" would lose the values of field "Author.name".
       Drop column "username" from "author" would lose the values of field "Author.username".
→ Run the command again with --rename Author.name:Author.fullName
→ Run the command again with --delete Author.name
→ Run the command again with --rename Author.username:Author.fullName
→ Run the command again with --delete Author.username
```

A helyes válasz: a `name` átnevezés (az adatok maradjanak meg), a `username` törlés:

```powershell
npm run migration:plan -- --name author_changes --rename Author.name:Author.fullName --delete Author.username
```

```
migrations/app/20261124T2043_author_changes
├─ Rename column "author"."name" to "full_name"
└─ ⚠ Drop column "username" from "author"

⚠ This migration contains destructive operations that may cause data loss.

ALTER TABLE "public"."author" RENAME COLUMN "name" TO "full_name";
ALTER TABLE "public"."author" DROP COLUMN "username";
```

> [!WARNING]
> A `--rename` nélkül a Prisma az átnevezést „régi oszlop törlése + új oszlop létrehozása” lépésként tervezné meg, és **a régi oszlop adatai elvesznének**. Mindig olvasd el, mit kérdez!

| Kapcsoló                 | Mikor?                                                       |
| ------------------------ | ------------------------------------------------------------ |
| `--rename Régi:Új`       | modellt vagy mezőt átneveztél, az adatok maradjanak meg      |
| `--delete Modell.mező`   | tényleg törölni akarod (az adat elvész)                      |
| `--convert Modell.mező`  | típusváltás, az átalakítást te írod meg a `migration.ts`-ben |
| `--backfill Modell.mező` | új kötelező mező, a meglévő sorok értékét te írod meg        |

**Típusváltás** (pl. `title String` → `title Varchar(100)`): a hosszabb szövegek levágódhatnak, ezért a Prisma ezt is megkérdezi. `--delete Article.title` esetén az adatbázis saját átalakítása fut (ami levághat vagy elronthat értékeket), `--convert Article.title` esetén a `migration.ts`-be egy `placeholder(...)` kerül, amelyet SQL-kifejezésre kell cserélni. Ilyenkor a fájl módosítása után futtasd le magát a fájlt, hogy az `ops.json` is frissüljön:

```powershell
node migrations/app/<mappa>/migration.ts
```

**Új kötelező mező** a meglévő sorokban ideiglenes értéket kap (`''`, `0`, `false`), erről a kimenet tájékoztat. Ha jobb értéket szeretnél, használd a `--backfill` kapcsolót. Ha egy addig nem kötelező mező lesz kötelező, és vannak `NULL` értékei, a `db migrate` hibát ad és megszámolja őket; töltsd ki az értékeket, és futtasd újra.

## 8. Migrációk futtatása egy másik adatbázison

Ha a migrációkat a saját gépeden már kipróbáltad, és most egy másik adatbázison (pl. Neonon vagy az éles szerveren) is le kell futtatni őket, állítsd át a `.env`-ben a kapcsolatot, és:

```powershell
npx prisma migration status
npx prisma db migrate --show
npx prisma db migrate --no-advance-ref
```

- A `--show` csak megmutatja, mely migrációk futnának le, nem változtat semmit.
- A `--no-advance-ref` azért kell, mert a `db` ref a **fejlesztői** adatbázisodhoz tartozik. Kapcsoló nélkül a `db migrate` (és az `npm run migrate` is) a másik adatbázis állapotára állítaná át.
- Egy üres adatbázison a `db migrate` az összes migrációt lefuttatja a baseline-tól kezdve.

## 9. További hasznos parancsok

| Parancs                                      | Mire jó?                                                             |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `npx prisma migration list`                  | a lemezen lévő migrációk listája (adatbázis nélkül)                  |
| `npx prisma migration show <mappanév>`       | egy migrációs csomag tartalma                                        |
| `npx prisma migration status --from db`      | mint a `migration:status`, de adatbázis nélkül, a `db` refből számol |
| `npx prisma db migrate --show`               | mely migrációk futnának le (nem változtat semmit)                    |
| `npx prisma db verify`                       | megfelel-e az adatbázis a contractnak                                |
| `npx prisma migration ref set db <mappanév>` | a `db` ref kézi átállítása egy migráció állapotára                   |

## 10. Gyakori hibák

- **Elmaradt az emit.** A `migration plan` a `contract.json`-ból dolgozik. Ha a `contract.prisma` módosítása után nem futtattad a `contract:emit`-et, a terv a régi contractból készül: ilyenkor `✔ No changes detected` jelenik meg, és nem jön létre mappa.
- **`from: (baseline)`, pedig már vannak migrációk.** Ez azt jelenti, hogy a terv az üres adatbázisból indul, vagyis minden táblát újra létre akarna hozni. Ne futtasd! Töröld a létrejött mappát, és nézd meg a `db` refet (`npx prisma migration list`).
- **`MIGRATION.HASH_NOT_IN_GRAPH` a `migration plan`-nél.** Migrációk mellett `db update`-et is használtál, ezért az adatbázis és a `db` ref olyan állapotban van, amelyhez nem vezet migráció. A változtatás már benne van az adatbázisban, csak a migráció hiányzik. Pótold: tervezd meg az utolsó migrációtól, majd állítsd a `db` refet az új migrációra:

  ```powershell
  npx prisma migration plan --from <utolsó migráció mappája> --name valtozas_neve
  npx prisma migration ref set db <az új migráció mappája>
  npm run migration:status
  ```

  A `migration:status` ezután nem mutat várakozó migrációt, mert a fejlesztői adatbázis már abban az állapotban van. Egy másik adatbázison az új migráció rendesen lefut.

- **`MIGRATION.HASH_MISMATCH` a `db migrate`-nél.** Valaki kézzel módosította a `migration.ts`-t vagy az `ops.json`-t, de nem futtatta le a fájlt. Futtasd: `node migrations/app/<mappa>/migration.ts`. Az `ops.json`-t és a `migration.json`-t soha ne szerkeszd kézzel.
- **Már lefuttatott migráció módosítása.** Amit már végrehajtottál (vagy commitoltál), ne írd át: készíts helyette egy új migrációt, amely kijavítja.
- **A `migrations` mappa nincs commitolva.** A társaidnál ilyenkor nem futnak le a változások, és a következő `migration plan` rossz helyről indul.
- **`next build` hiba egy migrációs fájl miatt.** A `migrations` mappának szerepelnie kell a `tsconfig.json` `exclude` listájában (a sablonban már benne van).

## 11. Puska

```powershell
# minden contract-módosítás után
npm run contract:emit
npm run migration:plan -- --name valtozas_neve
# átnézés: DDL preview, from: sor, kérdések (--rename / --delete)
npm run migration:status
npm run migrate
npx prisma db verify
# commit: contract.prisma + migrations mappa

# kísérletezés a saját gyakorló adatbázison, migráció nélkül
npm run contract:emit
npx prisma db update --dry-run
npx prisma db update

# a migrációk futtatása egy másik adatbázison
npx prisma db migrate --show
npx prisma db migrate --no-advance-ref
```

További részletek: `README.md` 9. és 10. pont, valamint a Prisma dokumentációja: https://www.prisma.io/docs/orm/migrations/how-migrations-work
