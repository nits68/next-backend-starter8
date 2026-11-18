# CHECK megszorítások Prisma 8-ban (`@@check`)

Tanulói segédlet: hogyan lehet a contractban (`prisma/contract.prisma`) olyan szabályokat megadni,
amelyeket **maga az adatbázis** ellenőriz minden beszúrásnál és módosításnál.

## 1. Mi az a CHECK megszorítás?

A `CHECK` egy feltétel, amelynek a tábla minden sorára teljesülnie kell. Ha egy `INSERT` vagy
`UPDATE` megsértené, a PostgreSQL elutasítja a műveletet, és a sor nem kerül be.

```sql
-- így nézne ki kézzel írt SQL-ben
CREATE TABLE ingatlan (
    ...
    ar integer NOT NULL,
    CONSTRAINT ingatlan_ar_pozitiv CHECK (ar > 0)
);
```

Miért jó? Az ellenőrzés akkor is lefut, ha valaki nem az API-n keresztül ír az adatbázisba (pl.
pgAdminból, seedből vagy egy másik programból), tehát a hibás adat **semmilyen úton** nem kerülhet
be.

## 2. Az alapforma

```prisma
model Ingatlan {
  id  Int @id()
  ar  Int
  ...

  @@check(expression: sql`ar > 0`, name: "ingatlan_ar_pozitiv")
  @@rls
  @@map("ingatlan")
}
```

| Rész           | Jelentés                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------- |
| `@@check`      | **modell szintű** attribútum (két `@`), a modell végére, a `@@map` mellé kerül           |
| `expression:`  | a feltétel, ami a `CHECK ( ... )` zárójelei közé kerül                                   |
| `` sql`...` `` | a feltételt **`sql` literálként** (backtick) kell írni, idézőjeles szöveget nem fogad el |
| `name:`        | a megszorítás nevének **előtagja**, kötelező (vagy helyette `map:`, lásd 5. pont)        |

Egy modellen **tetszőleges számú** `@@check` lehet, mindegyik külön sorba.

### Fontos: az adatbázisbeli oszlopneveket kell írni!

A feltételt a Prisma **nem értelmezi**, változtatás nélkül átadja a PostgreSQL-nek. Ezért a
kifejezésben a `@map(...)` szerinti **oszlopneveket** kell használni, nem a Prisma mezőneveket:

```prisma
  kepUrl String? @map("kep_url")

  @@check(expression: sql`kep_url LIKE 'https://%'`, name: "ingatlan_kep_https") // ✔ jó
  @@check(expression: sql`kepUrl LIKE 'https://%'`, name: "ingatlan_kep_https")  // ✘ rossz
```

A rossz változat a `contract emit`-en még átmegy (a Prisma nem ellenőrzi az SQL-t), de a
`db update` / `migrate` futásakor a PostgreSQL hibát ad: `column "kepurl" does not exist`.

### A név: előtag + hash

A `name: "ingatlan_ar_pozitiv"` csak előtag. Az adatbázisban a megszorítás neve egy 8 jegyű
hash-sel bővül, pl. `ingatlan_ar_pozitiv_3dbac4f6`. Ezt a Prisma kezeli, neked csak az előtagot
kell megadnod. Az előtag legyen beszédes: `<tábla>_<oszlop>_<szabály>`.

## 3. Példák

### 3.1 Számok: tartomány, előjel

```prisma
  @@check(expression: sql`ar > 0`, name: "ingatlan_ar_pozitiv")
  @@check(expression: sql`ar BETWEEN 100000 AND 5000000000`, name: "ingatlan_ar_tartomany")
  @@check(expression: sql`szobak >= 1 AND szobak <= 20`, name: "lakas_szobak")
```

A `BETWEEN a AND b` mindkét végpontot beleérti (`>= a AND <= b`).

### 3.2 Szövegek: hossz, üres szöveg tiltása

```prisma
  // legalább 2 karakter, a szóközöket nem számolva
  @@check(expression: sql`length(trim(nev)) >= 2`, name: "kategoria_nev_hossz")

  // ne lehessen üres szöveg (a NULL ettől még megengedett, ha a mező opcionális)
  @@check(expression: sql`leiras <> ''`, name: "ingatlan_leiras_nem_ures")
```

Ha a hossz felső korlátja kell, arra a `Varchar(n)` típus is jó (pl. `nev Varchar(50)`).
Túl hosszú értéknél ilyenkor `22001` hibakódot kapsz, nem `23514`-et.

### 3.3 Szövegminta: `LIKE` és reguláris kifejezés

```prisma
  // https://-sel kezdődjön
  @@check(expression: sql`kep_url LIKE 'https://%'`, name: "ingatlan_kep_https")

  // egyszerű e-mail-forma (~* = kis- és nagybetűt nem megkülönböztető regex)
  @@check(expression: sql`email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'`, name: "ugyfel_email")

  // pontosan 4 számjegy (pl. irányítószám)
  @@check(expression: sql`irsz ~ '^[0-9]{4}$'`, name: "cim_irsz")
```

A `LIKE`-ban a `%` tetszőleges karaktersorozatot, a `_` pontosan egy karaktert jelent.
SQL-ben a szöveget **aposztróf** (`'...'`) határolja, nem idézőjel.

### 3.4 Felsorolás: csak megadott értékek

```prisma
  allapot String

  @@check(expression: sql`allapot IN ('új', 'felújított', 'felújítandó')`, name: "ingatlan_allapot")
```

### 3.5 Két oszlop összehasonlítása ugyanabban a sorban

```prisma
  hirdetesDatuma Date? @default(now()) @map("hirdetes_datuma")
  lejarat        Date?

  @@check(expression: sql`lejarat > hirdetes_datuma`, name: "ingatlan_lejarat")
```

```prisma
  minAr Int @map("min_ar")
  maxAr Int @map("max_ar")

  @@check(expression: sql`min_ar <= max_ar`, name: "kereses_ar_sav")
```

### 3.6 Dátumok

```prisma
  // dátumállandó: DATE 'ÉÉÉÉ-HH-NN'
  @@check(expression: sql`hirdetes_datuma >= DATE '2000-01-01'`, name: "ingatlan_datum_min")
```

### 3.7 „Ha ... akkor ...” szabály

SQL-ben nincs „ha-akkor”, de az „**ha A, akkor B**” átírható így: **`NOT A OR B`**.

```prisma
  // ha nem tehermentes, akkor kötelező leírást adni
  @@check(expression: sql`tehermentes OR leiras IS NOT NULL`, name: "ingatlan_teher_leiras")

  // ha a kategória telek (3), akkor nem lehet szobaszám
  @@check(expression: sql`kategoria_id <> 3 OR szobak IS NULL`, name: "ingatlan_telek_szoba")
```

### 3.8 Egy feltétel vagy több?

Írhatsz egy `@@check`-be több feltételt is `AND`-del, de **jobb külön-külön** megadni őket.
Hibánál a megszorítás neve megmondja, melyik szabály sérült, és ebből pontosabb
hibaüzenetet adhatsz.

## 4. A NULL különleges eset

A `CHECK` csak akkor utasítja el a sort, ha a feltétel **hamis**. A `NULL`-lal végzett
összehasonlítás eredménye viszont „ismeretlen” (pl. `NULL > 0`), és ezt a PostgreSQL
**elfogadja**.

```prisma
  szobak Int?   // opcionális

  @@check(expression: sql`szobak > 0`, name: "lakas_szobak")
```

| `szobak` értéke | eredmény                  |
| --------------- | ------------------------- |
| `3`             | ✔ beszúrható              |
| `0`             | ✘ hiba (`23514`)          |
| `NULL`          | ✔ beszúrható (nem sérül!) |

Ha az értéknek kötelezően meg kell lennie, a mező **ne legyen opcionális** (`Int` a `Int?` helyett,
azaz `NOT NULL`). A `CHECK`-kel ezt nem kell külön kikötni.

## 5. `name:` vagy `map:`?

| Mikor                                 | Melyiket            | Megjegyzés                                                       |
| ------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| új szabályt írsz                      | `name: "előtag"`    | ezt használd                                                     |
| a szabály már létezik az adatbázisban | `map: "pontos_nev"` | a `contract infer` (`npm run db:infer1`) ilyet ír, **ne töröld** |

A `map:` alaknál a Prisma betűre pontosan összeveti a szöveget azzal, ahogy a PostgreSQL tárolja.
Ezért minden `contract emit` figyelmeztet (`PN_EXACT_NAME_BODY_COMPARISON`). Az inferrel kapott
`map:`-es sorok mellett ez a figyelmeztetés várható, nem hiba.

A `name:` és a `map:` közül **pontosan egyet** kell megadni.

## 6. Mit nem lehet CHECK-kel?

- **Másik táblára hivatkozni** (`kategoria_id IN (SELECT id FROM kategoria)`). Erre az idegen kulcs
  (`@relation`) való.
- **Más sorokat vizsgálni** (pl. „az ár ne legyen nagyobb az átlagnál”), összesítő függvényt
  (`count`, `avg`) használni. A CHECK mindig **egy sort** lát.
- **Egyediséget** előírni. Erre a `@unique` / `@@unique` való.
- **Mező szintű** `@check` nincs. Minden szabály modell szintű `@@check`, akkor is, ha csak egy
  oszlopról szól.
- Az aktuális időhöz kötött feltétel (`hirdetes_datuma <= CURRENT_DATE`) lefordul, de **nem ajánlott**.
  Csak beszúráskor és módosításkor ellenőrződik, és később a meglévő sorokra már nem lenne igaz.
  Az ilyet a route handlerben ellenőrizd.

## 7. Életbe léptetés

A `@@check` hozzáadása után (PowerShellben):

```powershell
npm run contract:emit
npm run db:update -- --dry-run   # előbb nézd meg, mit csinálna
npm run db:update                # vagy: npm run migration:plan -- --name ar_check ; npm run migrate
```

**Figyelem:** ha a táblában már van olyan sor, amely sérti az új szabályt, a PostgreSQL nem hozza
létre a megszorítást, és a parancs hibát ad (`check constraint ... is violated by some row`).
Ilyenkor előbb javítsd vagy töröld a hibás sorokat, vagy igazítsd a seed adatait, majd futtasd újra.

## 8. Hibakezelés a route handlerben

A CHECK megsértésekor a hiba `sqlState` értéke **`23514`**. Ez a kliens hibája, ezért a válasz
**`400`**:

```ts
} catch (error) {
  if (error instanceof Error && "sqlState" in error && error.sqlState === "23514") {
    return NextResponse.json({ message: "Érvénytelen adat!" }, { status: 400 });
  }
  throw error;
}
```

Ha pontosabb üzenetet szeretnél, a hiba `constraint` mezőjében ott a megszorítás neve (hash-sel,
pl. `ingatlan_ar_pozitiv_3dbac4f6`), ezért az **előtagot** vizsgáld:

```ts
if (error instanceof Error && "sqlState" in error && error.sqlState === "23514") {
  const constraint = "constraint" in error ? String(error.constraint) : "";
  const message = constraint.startsWith("ingatlan_ar_pozitiv")
    ? "Az árnak pozitívnak kell lennie!"
    : "Érvénytelen adat!";
  return NextResponse.json({ message }, { status: 400 });
}
```

| `sqlState` | Jelentés                         | HTTP  |
| ---------- | -------------------------------- | ----- |
| `23514`    | CHECK megszorítás sérült         | `400` |
| `23505`    | egyediség (`@unique`) sérült     | `409` |
| `23503`    | idegen kulcs hiba                | `400` |
| `22001`    | túl hosszú szöveg (`Varchar(n)`) | `400` |

Próbáld ki a `tests.http`-ben egy hibás kéréssel:

```http
### Hibás ár -> 400
POST http://localhost:3000/api/ingatlan
Content-Type: application/json

{ "kategoriaId": 1, "tehermentes": true, "ar": -5 }
```

## 9. Gyakori hibák

| Hibaüzenet                                                                | Ok                                        | Javítás                                         |
| ------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `PSL_CHECK_REQUIRES_NAME_OR_MAP: @@check requires a name or map argument` | hiányzik a `name:`                        | `name: "tabla_oszlop_szabaly"`                  |
| ``PSL_VALUE_TYPE_INCOMPATIBLE: Expected sql`...` ``                       | idézőjeles szöveg: `expression: "ar > 0"` | `` expression: sql`ar > 0` ``                   |
| `column "kepurl" does not exist` (`db update`-nél)                        | Prisma mezőnév az oszlopnév helyett       | a `@map` szerinti név: `kep_url`                |
| `check constraint ... is violated by some row`                            | a meglévő adatok sértik a szabályt        | javítsd az adatokat, aztán futtasd újra         |
| `syntax error at or near ...`                                             | hibás SQL a feltételben                   | szöveg `'aposztróffal'`, zárójelek, kulcsszavak |

## 10. Összefoglalás

```prisma
model Ingatlan {
  id             Int       @id()
  kategoriaId    Int       @map("kategoria_id")
  leiras         String?
  hirdetesDatuma Date?     @default(now()) @map("hirdetes_datuma")
  tehermentes    Boolean
  ar             Int
  kepUrl         String?   @map("kep_url")

  // kapcsolati mező
  kategoria      Kategoria @relation(fields: [kategoriaId], references: [id])

  @@check(expression: sql`ar > 0`, name: "ingatlan_ar_pozitiv")
  @@check(expression: sql`kep_url LIKE 'https://%'`, name: "ingatlan_kep_https")
  @@check(expression: sql`hirdetes_datuma >= DATE '2000-01-01'`, name: "ingatlan_datum_min")
  @@index([kategoriaId], map: "ingatlan_kategoria_id_idx")
  @@rls
  @@map("ingatlan")
}
```

- ``@@check(expression: sql`feltétel`, name: "előtag")``, modell szinten, akárhány lehet.
- A feltételben az **adatbázisbeli oszlopnevek** szerepelnek (`kep_url`, nem `kepUrl`).
- A `NULL` átmegy a CHECK-en. Kötelező értékhez nem opcionális mező kell.
- Hibakód: `23514` → `400`.
- Contract módosítás után: `npm run contract:emit` + `npm run db:update`.
