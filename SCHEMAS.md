# PostgreSQL-sémák (Schemas)

A PostgreSQL-ben a **séma (schema) az adatbázison belüli logikai névtér
és objektumcsoportosítási egység**. Segítségével egy adatbázison belül
különböző objektumokat -- például táblákat, nézeteket, függvényeket és
típusokat -- rendezhetünk csoportokba.

Fontos: a PostgreSQL-ben a séma nem ugyanaz, mint az adatbázis. Egy
adatbázison belül több séma is lehet.

## 1. Mire használjuk a sémákat?

Például egy iskola informatikai rendszerében az adatbázis objektumait
több sémába rendezhetjük:

``` text
iskola_adatbazis
│
├── public          – általános adatok
│   ├── users
│   └── settings
│
├── oktatas         – oktatási adatok
│   ├── students
│   ├── teachers
│   └── classes
│
└── penzugy         – pénzügyi adatok
    ├── invoices
    └── payments
```

A sémák legfontosabb előnyei:

1.  **Logikai csoportosítás:** az összetartozó táblák és más
    adatbázis-objektumok külön csoportba kerülnek.
2.  **Névütközések elkerülése:** két különböző sémában lehet azonos nevű
    tábla.
3.  **Jogosultságkezelés:** különböző felhasználóknak eltérő hozzáférést
    adhatunk az egyes sémákhoz.
4.  **Alkalmazások elkülönítése:** egy adatbázison belül több alkalmazás
    objektumait is kezelhetjük egymástól elkülönítve.

## 2. Hogyan hivatkozunk egy sémában lévő táblára?

A tábla teljes neve a séma nevéből és a tábla nevéből áll:

``` sql
schema_neve.tabla_neve
```

Például:

``` sql
SELECT * FROM oktatas.students;

SELECT * FROM penzugy.invoices;
```

Így egyértelmű, hogy melyik sémában található táblát szeretnénk elérni.

## 3. Hogyan hozunk létre sémát?

Séma létrehozása:

``` sql
CREATE SCHEMA oktatas;
```

Tábla létrehozása az adott sémában:

``` sql
CREATE TABLE oktatas.students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(150)
);
```

A séma törlése:

``` sql
DROP SCHEMA oktatas CASCADE;
```

A `CASCADE` a sémában található objektumokat -- például táblákat és
nézeteket -- is törli. Ezért különösen óvatosan kell használni.

## 4. Mi a helyzet a `public` sémával?

A PostgreSQL-adatbázisokban alapértelmezés szerint rendelkezésre áll a
`public` nevű séma.

Ha nem adunk meg külön sémát:

``` sql
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);
```

akkor a tábla az aktuális `search_path` beállítás szerinti első olyan
sémába kerül, amelyben a felhasználónak van megfelelő jogosultsága.
Alapértelmezett beállítások mellett ez általában a `public` séma.

A `search_path` beállítás határozza meg, hogy a PostgreSQL mely sémákban
keresse a séma nélkül megadott objektumokat.

A beállítás lekérdezése:

``` sql
SHOW search_path;
```

## 5. PostgreSQL és MySQL: mi a különbség?

A MySQL-ben a `DATABASE` és a `SCHEMA` gyakorlatilag szinonimák.

PostgreSQL-ben viszont három különböző fogalomról beszélünk:

  Fogalom    Jelentés
  ---------- -----------------------------------
  Database   Adatbázis
  Schema     Adatbázison belüli logikai névtér
  Table      Tábla

Ezért PostgreSQL-ben egy adatbázison belül több, egymástól logikailag
elkülönített sémát is létrehozhatunk.

## Röviden összefoglalva

-   Egy PostgreSQL-adatbázison belül több séma lehet.
-   A sémák az adatbázis-objektumok rendszerezésére és elkülönítésére
    szolgálnak.
-   Egy tábla teljes neve: `sémanév.táblanév`.
-   A `public` az alapértelmezettként gyakran használt séma.
-   A sémákhoz külön jogosultságok rendelhetők.
