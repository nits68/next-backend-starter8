# Dátum- és időkezelés: PostgreSQL ↔ Prisma 8 ↔ TypeScript ↔ JSON

Összefoglaló táblázatok a dátum- és időtípusokhoz. Minden adatot a sablon verzióival
(`@prisma/orm-postgres@8.0.0-rc.23`, `prisma@8.0.0-rc.33`, Node.js 24, PostgreSQL 18, a szerver
időzónája `Europe/Budapest`) próbáltunk ki: contract → `db init` → `create()` → a visszakapott
érték → `NextResponse.json()`.

## 1. A leggyakoribb esetek (ezeket használd)

| Mire?                           | Prisma 8 contract                                     | PostgreSQL oszlop | TypeScript | JSON válaszban               |
| ------------------------------- | ----------------------------------------------------- | ----------------- | ---------- | ---------------------------- |
| létrehozás időpontja            | `TimestamptzJsDate @default(now())`                   | `timestamptz`     | `Date`     | `"2026-09-27T13:15:29.257Z"` |
| utolsó módosítás időpontja      | `TimestamptzJsDate @onCreate(now()) @onUpdate(now())` | `timestamptz`     | `Date`     | `"2026-09-27T13:15:29.257Z"` |
| időpont (pl. foglalás kezdete)  | `TimestamptzJsDate`                                   | `timestamptz`     | `Date`     | `"2026-09-27T13:15:29.257Z"` |
| naptári nap (pl. születésnap)   | `DateString` vagy `Date`                              | `date`            | `string`   | `"2026-09-27"`               |
| napon belüli idő (pl. nyitás)   | `TimeString` vagy `Time`                              | `time`            | `string`   | `"15:15:29"`                 |
| időtartam (pl. kölcsönzési idő) | `IntervalString`                                      | `interval`        | `string`   | `"P1DT2H30M"` (ISO 8601)     |

> **Szabály:** ha **időpontot** tárolsz (egy pillanatot), legyen `timestamptz` és `...JsDate`
> típus. Ha csak **naptári napot** (időpont nélkül), legyen `date` és `DateString`.

## 2. Az összes dátum- és időtípus

| Prisma 8 contract                                                               | PostgreSQL oszlop            | TypeScript   | JSON válaszban (példa)          | Megjegyzés                                                                                                       |
| ------------------------------------------------------------------------------- | ---------------------------- | ------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `TimestamptzJsDate`                                                             | `timestamptz` (6 tizedes)    | `Date`       | `"2026-09-27T13:15:29.257Z"`    | **ajánlott** időpontokhoz; a sablon ezt használja                                                                |
| `DateTime`                                                                      | `timestamptz(3)`             | `Date`       | `"2026-09-27T13:15:29.257Z"`    | rövid alak = `TimestamptzJsDate(3)`                                                                              |
| `DateTime(precision: 6)`                                                        | `timestamptz` (6 tizedes)    | `Date`       | `"2026-09-27T13:15:29.257Z"`    | ezt adja a `contract infer` `timestamptz` oszlopra                                                               |
| `TimestamptzString`                                                             | `timestamptz`                | `string`     | `"2026-09-27T13:15:29.257123Z"` | szövegként, UTC-ben, mikroszekundumokkal                                                                         |
| `DateTime(as: string)`                                                          | `timestamptz` (6 tizedes)    | `string`     | `"2026-09-27T13:15:29.257123Z"` | rövid alak = `TimestamptzString`                                                                                 |
| `TimestampJsDate`                                                               | `timestamp` (időzóna nélkül) | `Date`       | `"2026-09-27T13:15:29.257Z"`    | az oszlopba az **UTC** idő kerül (lásd 5. pont)                                                                  |
| `DateTime(storage: timestamp)`                                                  | `timestamp(3)`               | `Date`       | `"2026-09-27T13:15:29.257Z"`    | rövid alak; az infer `precision: 6`-tal írja                                                                     |
| `TimestampString`                                                               | `timestamp`                  | `string`     | `"2026-09-27T15:15:29.257123"`  | a beírt "falióra" idő, időzóna nélkül                                                                            |
| `DateString`                                                                    | `date`                       | `string`     | `"2026-09-27"`                  |                                                                                                                  |
| `Date`                                                                          | `date`                       | `string`     | `"2026-09-27"`                  | rövid alak = `DateString`; ezt adja az infer                                                                     |
| `TimeString`                                                                    | `time`                       | `string`     | `"15:15:29"`, `"15:15:29.5"`    |                                                                                                                  |
| `Time`                                                                          | `time`                       | `string`     | `"15:15:29"`                    | rövid alak = `TimeString`; ezt adja az infer                                                                     |
| `Timetz`                                                                        | `timetz`                     | `string`     | `"15:15:29+02:00"`              | ritkán kell                                                                                                      |
| `IntervalString`                                                                | `interval`                   | `string`     | `"P1DT2H30M"`                   | írni is ISO 8601 alakban kell (`"PT1H"`)                                                                         |
| `TimestamptzTemporal`, `DateTemporal`, `TimeTemporal`, `DateTime(as: temporal)` | —                            | `Temporal.*` | —                               | **ne használd:** Node.js 24-en `RUNTIME.TEMPORAL_UNAVAILABLE` (a `Temporal` API csak a Node.js 26-tól beépített) |

- A `precision` a másodperc tizedesjegyeinek száma (0–6). A PostgreSQL alapértéke 6
  (mikroszekundum), a JavaScript `Date` viszont csak 3 jegyet (ezredmásodperc) tud, ezért a
  `Date` típusú mezőkben az utolsó 3 jegy elveszik.
- A régebbi RC-k `Timestamptz`, `Timestamp` típusa és a `temporal.*` alakok megszűntek
  (`PSL_UNRESOLVED_REFERENCE`).

## 3. Automatikus kitöltés

| Contract                                              | Mikor kap értéket?                     | Kinek az órája szerint? |
| ----------------------------------------------------- | -------------------------------------- | ----------------------- |
| `TimestamptzJsDate @default(now())`                   | létrehozáskor, ha nem adsz meg értéket | az adatbázis szerveréé  |
| `TimestamptzJsDate @onCreate(now())`                  | létrehozáskor                          | az alkalmazásé (Node)   |
| `TimestamptzJsDate @onCreate(now()) @onUpdate(now())` | létrehozáskor és minden `update()`-nél | az alkalmazásé (Node)   |
| `TimestamptzJsDate?`                                  | csak ha megadod (különben `null`)      | —                       |

> Az `@onUpdate(now())` mező kézzel írt SQL-lel (`UPDATE ...`, pgAdmin) végzett módosításnál
> **nem** frissül, mert az értéket a Prisma adja, nem az adatbázis.

## 4. Írás és szűrés a kódban

| Contract típus          | Írás (`create`, `update`)                                       | Szűrés (`where`)                                         |
| ----------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| `...JsDate`, `DateTime` | **csak `Date` objektum**: `{ startAt: new Date(body.startAt) }` | `.where((e) => e.createdAt.gte(new Date("2026-01-01")))` |
| `DateString`, `Date`    | szöveg: `"2026-09-27"`                                          | `.where((e) => e.birthDate.gte("2008-01-01"))`           |
| `TimeString`, `Time`    | szöveg: `"15:15:29"`, vagy `"15:15"` (→ `"15:15:00"`)           | `.where((e) => e.opensAt.lt("09:00"))`                   |
| `TimestamptzString`     | szöveg: `"2026-09-27T13:15:29Z"`, `"2026-09-27 15:15:29+02"`    | szöveggel                                                |
| `IntervalString`        | ISO 8601 időtartam: `"PT1H"`, `"P14D"`, `"P1DT2H30M"`           | szöveggel                                                |

**A leggyakoribb hiba:** a `request.json()` a dátumot **szövegként** adja, a `...JsDate` mező
viszont szöveget nem fogad el:

```
RUNTIME.ENCODE_FAILED ... pg/timestamptz-date@1 requires a valid Date or a representable ISO
PostgreSQL timestamp with time zone; use TimestamptzString for unsupported values
```

Megoldás: a route-ban alakítsd át, és ellenőrizd:

```ts
const body = await request.json();
const startAt = new Date(body.startAt); // "2026-09-27T13:15:29Z" → Date
if (Number.isNaN(startAt.getTime())) {
  return NextResponse.json({ message: "Hibás dátum!" }, { status: 400 });
}
const created = await db.orm.public.Booking.create({ ...body, startAt });
```

A `DateString` mező szöveget kap, és a PostgreSQL ellenőrzi:

| Beküldött érték          | Eredmény                                                      |
| ------------------------ | ------------------------------------------------------------- |
| `"2026-09-27"`           | `"2026-09-27"`                                                |
| `"2026-9-7"`             | `"2026-09-07"` (elfogadja)                                    |
| `"2026-09-27T10:00:00Z"` | `"2026-09-27"` (az időt levágja)                              |
| `"2026-02-30"`           | hiba, `sqlState` `22008` (date/time field value out of range) |

## 5. Időzónák

| Helyzet                                     | Mit kapsz?                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Date` a JSON válaszban                     | mindig **UTC** ISO szöveg `Z` végződéssel: a budapesti 15:15 → `"...T13:15:29.257Z"` (nyáron)   |
| `timestamptz` a psql-ben / pgAdminban       | a szerver időzónájában: `2026-09-27 15:15:29.257+02`                                            |
| `TimestampJsDate` (`timestamp`) a psql-ben  | az **UTC** idő időzóna nélkül: `2026-09-27 13:15:29.257` (ezért időpontra inkább `timestamptz`) |
| `TimestamptzString` a kódban                | UTC ISO szöveg: `"2026-09-27T13:15:29.257123Z"`                                                 |
| `"2026-09-27"` → `TimestamptzString` mezőbe | a szerver időzónájának éjfele: `"2026-09-26T22:00:00Z"`                                         |
| `new Date("2026-09-27")` JavaScriptben      | **UTC** éjfél (Budapesten 02:00), nem helyi éjfél                                               |

Megjelenítés magyar idő szerint (a kliensben vagy a válasz összeállításakor):

```ts
new Date("2026-09-27T13:15:29.257Z").toLocaleString("hu-HU", { timeZone: "Europe/Budapest" });
// "2026. 09. 27. 15:15:29"
```

A mai nap `"ÉÉÉÉ-HH-NN"` alakban, helyi idő szerint (`DateString` mezőhöz):

```ts
const d = new Date();
d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
const today = d.toISOString().slice(0, 10); // "2026-09-27"
```

> A `new Date().toISOString().slice(0, 10)` önmagában **UTC** szerinti napot ad: éjfél és 02:00
> között (nyáron) még az előző napot.

## 6. PostgreSQL típusok röviden

| PostgreSQL    | Teljes név                    | Mit tárol?                                                    | Példa (psql kimenet)         |
| ------------- | ----------------------------- | ------------------------------------------------------------- | ---------------------------- |
| `date`        | `date`                        | naptári nap                                                   | `2026-09-27`                 |
| `time`        | `time without time zone`      | napon belüli idő                                              | `15:15:29`                   |
| `timetz`      | `time with time zone`         | idő + eltolás                                                 | `15:15:29+02`                |
| `timestamp`   | `timestamp without time zone` | dátum + idő, időzóna nélkül ("falióra")                       | `2026-09-27 15:15:29.257123` |
| `timestamptz` | `timestamp with time zone`    | **időpont** (UTC-ben tárolja, a szerver időzónájában mutatja) | `2026-09-27 15:15:29.257+02` |
| `interval`    | `interval`                    | időtartam                                                     | `1 day 02:30:00`             |

Hasznos SQL (pgAdmin, psql):

```sql
SELECT now();                                   -- most (timestamptz)
SELECT current_date;                            -- mai nap (date)
SELECT now() AT TIME ZONE 'Europe/Budapest';    -- helyi falióra idő (timestamp)
SELECT created_at::date FROM users;             -- csak a nap
SELECT * FROM posts WHERE created_at >= now() - interval '7 days';
SHOW timezone;                                  -- a szerver időzónája
```

## 7. `contract infer` → mit kapsz

| Oszlop az adatbázisban | Az infer által írt típus                     | Kell javítani?                                  |
| ---------------------- | -------------------------------------------- | ----------------------------------------------- |
| `timestamptz`          | `DateTime(precision: 6)`                     | nem (`Date`)                                    |
| `timestamptz(3)`       | `DateTime`                                   | nem (`Date`)                                    |
| `timestamp`            | `DateTime(storage: timestamp, precision: 6)` | nem (`Date`), de lásd az 5. pontot az UTC miatt |
| `date`                 | `Date`                                       | nem (`string`)                                  |
| `time`                 | `Time`                                       | nem (`string`)                                  |
