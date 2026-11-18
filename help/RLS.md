# Sorszintű biztonság (RLS) Prisma 8-ban és a Neonon (`@@rls`)

Tanulói segédlet: mit csinál a contractban minden modell végén ott álló `@@rls`, miért nem veszed
észre a hatását a Neonon, és hogyan lehet vele valódi szabályokat írni.

## 1. Mi az RLS?

A PostgreSQL kétféleképpen korlátozhatja, ki mit érhet el:

| Szint     | Eszköz                          | Kérdés, amire válaszol                             |
| --------- | ------------------------------- | -------------------------------------------------- |
| tábla     | `GRANT` / `REVOKE`              | Hozzáférhet-e a felhasználó a táblához egyáltalán? |
| sor (RLS) | `ROW LEVEL SECURITY` + `POLICY` | A táblán belül **mely sorokat** láthatja, írhatja? |

Ha a táblán be van kapcsolva az RLS (row-level security), a PostgreSQL minden lekérdezésnél
csak azokat a sorokat engedi, amelyekre valamelyik szabály (policy) igaz. **Ha nincs egy szabály
sem, minden tiltva van.** Ilyenkor a `SELECT` 0 sort ad vissza, nem hibát.

## 2. A `@@rls` a contractban

```prisma
model Ingatlan {
  id  Int @id()
  ...

  @@rls
  @@map("ingatlan")
}
```

A `@@rls` hatására a `db init` / `db update` lefuttatja ezt:

```sql
ALTER TABLE ingatlan ENABLE ROW LEVEL SECURITY;
```

Egyetlen sorral bekapcsolja az RLS-t, szabály nélkül. Ez az alapállapot **mindent tilt**, kivéve
a tábla **tulajdonosának** (és a szuperfelhasználónak).

## 3. Miért nem veszed észre a Neonon?

A `.env`-ben a Neon Connect ablakából másolt URL a `neondb_owner` felhasználót tartalmazza:

```
postgresql://neondb_owner:<JELSZÓ>@<SAJÁT-VÉGPONT>...neon.tech/neondb?...
```

A táblákat a `npm run db:init` / `db:setup` ezzel a felhasználóval hozta létre, tehát
**`neondb_owner` a táblák tulajdonosa**. A tulajdonosra az RLS nem vonatkozik, így:

- az API (route handlerek), a seed és a Prisma CLI ugyanúgy működik, mintha nem lenne `@@rls`,
- a Neon Console **Tables** és **SQL Editor** nézete is mindent mutat (az is `neondb_owner`-ként fut).

Akkor miért van ott? Két okból:

1. **Supabase-kompatibilitás:** a Supabase az új táblákon automatikusan bekapcsolja az RLS-t.
   `@@rls` nélkül a `db init` ki akarná kapcsolni, és hibával leáll (README 6.5).
2. **Biztonság:** ha a táblákat más úton is elérhetővé tesszük, például a Neon **Data API**-val
   (HTTP-n elérhető táblák, a Neon Console-ban kapcsolható be) vagy egy másik adatbázis-felhasználóval,
   akkor az RLS miatt ők alapból semmit sem látnak, amíg szabályt nem írunk nekik.

## 4. Kipróbálás a Neon SQL Editorban

Hozz létre egy szerepkört (role), amely **nem** tulajdonos, és nézd meg, mit lát. A Neon Console →
**SQL Editor**-ban futtasd egyben:

```sql
-- be van-e kapcsolva az RLS? (t = igen)
SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('ingatlan', 'kategoria');

CREATE ROLE diak NOLOGIN;             -- új szerepkör, bejelentkezni nem tud
GRANT diak TO neondb_owner;           -- hogy átválthassunk rá (SET ROLE)
GRANT SELECT, INSERT ON ingatlan TO diak;

SET ROLE diak;                        -- innentől "diak"-ként futunk
SELECT count(*) FROM ingatlan;        -- 0: van jog a táblára, de nincs szabály
RESET ROLE;                           -- vissza neondb_owner-re
SELECT count(*) FROM ingatlan;        -- az összes sor
```

A `GRANT` nélkül a `diak` hibát kapna (`permission denied for table ingatlan`, `42501`). A `GRANT`
után már hozzáfér a táblához, de az RLS miatt egy sort sem lát.

## 5. Szabályok (policy) a contractban

A Prisma 8 a szabályokat is a contractban kezeli, `policy_<művelet>` blokkokkal. A szerepkört
deklarálni kell a `namespace unbound { }` blokkban. A Prisma **nem hozza létre**, csak hivatkozik
rá, ezért előbb létre kell hozni (4. pont, `CREATE ROLE`).

```prisma
// use prisma-8
namespace unbound {
  role diak {}
}

model Ingatlan {
  ...
  @@rls
  @@map("ingatlan")
}

// a diak csak a tehermentes ingatlanokat láthatja
policy_select ingatlan_olvasas {
  target = Ingatlan
  roles  = [diak]
  using  = sql`tehermentes`
}

// a diak csak pozitív árú ingatlant szúrhat be
policy_insert ingatlan_beszuras {
  target    = Ingatlan
  roles     = [diak]
  withCheck = sql`ar > 0`
}
```

| Blokk           | SQL művelet | Kulcsok              |
| --------------- | ----------- | -------------------- |
| `policy_select` | `SELECT`    | `using`              |
| `policy_insert` | `INSERT`    | `withCheck`          |
| `policy_update` | `UPDATE`    | `using`, `withCheck` |
| `policy_delete` | `DELETE`    | `using`              |
| `policy_all`    | mind        | `using`, `withCheck` |

- **`using`:** mely **meglévő** sorokat láthatja, módosíthatja vagy törölheti. A többi sor számára
  nem létezik.
- **`withCheck`:** milyen **új vagy módosított** sort írhat. Ha nem teljesül, hibát kap.
- A feltétel `` sql`...` `` literál, és ugyanúgy, mint a `@@check`-nél (lásd [CHECK.md](CHECK.md)),
  az **adatbázisbeli oszlopneveket** kell benne írni (`kategoria_id`, nem `kategoriaId`).
- Egy modellre több szabály is írható. Ha ugyanarra a műveletre több is van, elég, ha az egyik igaz
  (VAGY kapcsolat).
- A `target` modellen kötelező a `@@rls`. Nélküle a `contract emit` hibát ad.
- A szabály neve itt is előtag: az adatbázisban hash-sel bővül (pl. `ingatlan_olvasas_3c471e95`).

Életbe léptetés (PowerShell):

```powershell
npm run contract:emit
npm run db:update -- --dry-run   # nézd meg: CREATE POLICY ...
npm run db:update
```

Utána a 4. pont `SET ROLE diak; SELECT count(*) FROM ingatlan;` sora már a tehermentes ingatlanok
számát adja.

## 6. Mit jelent ez az alkalmazásnak?

Amíg a `DATABASE_URL` a `neondb_owner` felhasználót használja, **semmit**: a tulajdonosra a
szabályok nem vonatkoznak. Ha az alkalmazás egy szabályokkal korlátozott szerepkörrel csatlakozna:

| Művelet                                                      | Eredmény                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| `.all()` lekérdezés                                          | csak a `using` szerint látható sorok                         |
| `.where({ id }).first()` nem látható sorra                   | `null` → a route `404`-et ad                                 |
| `.where({ id }).update(...)` / `.delete()` nem látható sorra | `null` (nem hiba!) → `404`                                   |
| `withCheck`-et sértő `create` / `update`                     | hiba: `new row violates row-level security policy` (`42501`) |
| nincs `GRANT` a táblára                                      | hiba: `permission denied for table ...` (`42501`)            |

## 7. Ne kapcsold ki!

- A `@@rls` maradjon **minden** modellen, az újakon is.
- Ha kitörlöd, a `db update` ki akarná kapcsolni az RLS-t. Ezt a Prisma veszélyes műveletnek tekinti,
  és csak külön engedéllyel (`--allow <Modell>`) hajtja végre. A Supabase-en pedig a táblák a
  nyilvános kulccsal bárki számára elérhetővé válnának.

## 8. Takarítás a kísérlet után

Előbb vedd ki a contractból a `policy_*` blokkokat és a `role diak {}` sort, majd
`npm run contract:emit` és `npm run db:update`. Utána az SQL Editorban:

```sql
DROP OWNED BY diak;   -- a diak jogainak (GRANT) visszavonása
DROP ROLE diak;
```

## 9. Gyakori hibák

| Hibaüzenet                                                            | Ok                                                   | Javítás                                    |
| --------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| `PSL_EXTENSION_TARGET_MODEL_MISSING_ATTRIBUTE`                        | a szabály modelljén nincs `@@rls`                    | `@@rls` a modellre                         |
| `PSL_ROLE_BLOCK_OUTSIDE_UNBOUND_NAMESPACE`                            | a `role` blokk nem a `namespace unbound { }`-ban van | tedd bele                                  |
| `MIGRATION.PLANNING_FAILED ... Disable row-level security` (Supabase) | hiányzik a `@@rls`                                   | `@@rls` minden modellre                    |
| a `SELECT` 0 sort ad, nincs hiba                                      | RLS be van kapcsolva, nincs a szerepkörre szabály    | `policy_select` a szerepkörre              |
| `permission denied for table ...`                                     | hiányzik a `GRANT`                                   | `GRANT SELECT, ... ON tabla TO szerepkor;` |
| `role "diak" does not exist`                                          | a szerepkör nincs létrehozva az adatbázisban         | `CREATE ROLE diak NOLOGIN;`                |

## 10. Összefoglalás

- `@@rls` = `ENABLE ROW LEVEL SECURITY`. Szabály nélkül mindent tilt, **kivéve a tulajdonosnak**.
- Neonon az alkalmazás `neondb_owner`-ként, a táblák tulajdonosaként csatlakozik, ezért nem érzi.
- Szabályok: `policy_select` / `_insert` / `_update` / `_delete` / `_all`, `using` (melyik sort
  látja) és `withCheck` (milyen sort írhat), a szerepkör a `namespace unbound { role ... {} }` blokkban.
- A szerepkört (`CREATE ROLE`) és a táblajogot (`GRANT`) SQL-ben kell létrehozni, ezt a Prisma nem
  csinálja meg.
- A `@@rls`-t ne töröld.
