# MySQL vs. PostgreSQL – a legfontosabb különbségek

Összefoglaló azoknak, akik MySQL-lel (pl. XAMPP, phpMyAdmin) dolgoztak, és most PostgreSQL-re
váltanak. A példák MySQL 8 és PostgreSQL 15+ szerint készültek.

## 1. Gyors áttekintés

| Téma                        | MySQL                                     | PostgreSQL                                             |
| --------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| alapértelmezett port        | `3306`                                    | `5432`                                                 |
| alapértelmezett felhasználó | `root`                                    | `postgres`                                             |
| grafikus kezelő             | phpMyAdmin, MySQL Workbench               | pgAdmin, DBeaver, VS Code PostgreSQL bővítmény         |
| parancssori kliens          | `mysql -u root -p`                        | `psql -U postgres -d mydb`                             |
| névtér                      | adatbázis (`USE mydb`)                    | adatbázis → **séma** (`public`) → tábla                |
| azonosító idézése           | `` `nev` `` (backtick)                    | `"nev"` (idézőjel)                                     |
| szöveg                      | `'szöveg'` (alapból `"szöveg"` is)        | csak `'szöveg'`                                        |
| automatikus azonosító       | `AUTO_INCREMENT`                          | `serial` / `GENERATED ALWAYS AS IDENTITY` (sorozattal) |
| logikai típus               | `BOOLEAN` = `TINYINT(1)` (`1`/`0`)        | valódi `boolean` (`true`/`false`)                      |
| összehasonlítás             | alapból **kis-/nagybetű érzéketlen**      | **kis-/nagybetű érzékeny**                             |
| beszúrt rekord visszaadása  | `LAST_INSERT_ID()`                        | `INSERT ... RETURNING *`                               |
| DDL tranzakcióban           | nem (`CREATE`/`ALTER` azonnal véglegesít) | igen (`ROLLBACK`-kel visszavonható)                    |

## 2. Nevek és idézőjelek

| Mire?                    | MySQL                                            | PostgreSQL                                                      |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------------------- |
| foglalt szó mint név     | ``SELECT `order` FROM t``                        | `SELECT "order" FROM t`                                         |
| nagybetűs név            | `SELECT createdAt FROM users` működik            | `SELECT "createdAt" FROM users` (idézőjel nélkül → `createdat`) |
| tábla nevének betűmérete | operációs rendszertől függ (Windows: nem számít) | mindig számít, idézőjel nélkül kisbetűsre alakul                |
| oszlopnév betűmérete     | nem számít                                       | idézőjel nélkül kisbetűsre alakul                               |

> **Tanulság:** PostgreSQL-ben a tábla- és oszlopnevek legyenek **kisbetűsek, `snake_case`**
> írásmódúak (`created_at`, `author_id`), így sosem kell idézőjel. A Prisma contractban a
> `@map("created_at")` köti össze a camelCase mezőnevet a snake_case oszloppal (README 7. pont).

## 3. Adattípusok

| Mire?                 | MySQL                                  | PostgreSQL                                                                   |
| --------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| egész szám            | `INT`, `INT UNSIGNED`                  | `integer` (nincs `UNSIGNED`, helyette `CHECK (x >= 0)`)                      |
| automatikus azonosító | `INT AUTO_INCREMENT PRIMARY KEY`       | `serial PRIMARY KEY` vagy `integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY` |
| logikai               | `BOOLEAN` (valójában `TINYINT(1)`)     | `boolean`                                                                    |
| szöveg                | `VARCHAR(n)`, `TEXT`                   | `varchar(n)`, `text` (a `text` hossza korlátlan, ugyanolyan gyors)           |
| pénz, pontos szám     | `DECIMAL(10,2)`                        | `numeric(10,2)`                                                              |
| dátum                 | `DATE`                                 | `date`                                                                       |
| dátum + idő           | `DATETIME` (időzóna nélkül)            | `timestamp` (időzóna nélkül)                                                 |
| időpont               | `TIMESTAMP` (UTC-ben tárol, 1970–2038) | `timestamptz` (UTC-ben tárol, széles tartomány)                              |
| felsorolás            | `ENUM('a','b')` az oszlopnál           | `CREATE TYPE allapot AS ENUM ('a','b')` külön típusként                      |
| JSON                  | `JSON`                                 | `json`, és a gyorsabb, indexelhető `jsonb`                                   |
| tömb                  | nincs                                  | `text[]`, `integer[]` …                                                      |
| UUID                  | `CHAR(36)` / `BINARY(16)`              | `uuid`                                                                       |

Részletesen a dátum- és időtípusokról: [DATE-TIME.md](DATE-TIME.md).

## 4. SQL írásmód

| Mire?                            | MySQL                                             | PostgreSQL                                                  |
| -------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| lapozás                          | `LIMIT 20, 10` vagy `LIMIT 10 OFFSET 20`          | csak `LIMIT 10 OFFSET 20`                                   |
| szövegek összefűzése             | `CONCAT(a, ' ', b)` (a `\|\|` itt **VAGY**!)      | `a \|\| ' ' \|\| b` vagy `concat(a, ' ', b)`                |
| kis-/nagybetű érzéketlen keresés | `LIKE` (alapból érzéketlen)                       | `ILIKE` (a `LIKE` érzékeny)                                 |
| reguláris kifejezés              | `REGEXP 'minta'`                                  | `~ 'minta'`, érzéketlenül `~* 'minta'`                      |
| NULL helyett érték               | `IFNULL(x, 0)`                                    | `COALESCE(x, 0)` (MySQL-ben is van)                         |
| feltétel                         | `IF(feltétel, a, b)`                              | `CASE WHEN feltétel THEN a ELSE b END`                      |
| csoport szövegei egy sorban      | `GROUP_CONCAT(nev SEPARATOR ', ')`                | `string_agg(nev, ', ')`                                     |
| egész osztás                     | `5 / 2` = `2.5000`, egész: `5 DIV 2`              | `5 / 2` = `2` (egész / egész = egész!), tört: `5 / 2.0`     |
| mai nap                          | `CURDATE()`                                       | `current_date`                                              |
| dátum + 7 nap                    | `DATE_ADD(d, INTERVAL 7 DAY)`                     | `d + interval '7 days'`                                     |
| dátum formázása                  | `DATE_FORMAT(d, '%Y.%m.%d')`                      | `to_char(d, 'YYYY.MM.DD')`                                  |
| típusátalakítás                  | `CAST(x AS SIGNED)`                               | `CAST(x AS integer)` vagy `x::integer`                      |
| teljes külső összekapcsolás      | nincs (`LEFT JOIN … UNION … RIGHT JOIN`)          | `FULL OUTER JOIN`                                           |
| `GROUP BY`                       | régebben engedékeny (`ONLY_FULL_GROUP_BY` nélkül) | szigorú: minden nem összesített oszlop kell a `GROUP BY`-ba |

### Beszúrás vagy módosítás (upsert)

```sql
-- MySQL
INSERT INTO films (title, content) VALUES ('Vuk', 'animációs')
ON DUPLICATE KEY UPDATE content = VALUES(content);

-- PostgreSQL
INSERT INTO films (title, content) VALUES ('Vuk', 'animációs')
ON CONFLICT (title) DO UPDATE SET content = EXCLUDED.content;
```

### A beszúrt rekord azonosítója

```sql
-- MySQL
INSERT INTO users (email) VALUES ('anna@pelda.hu');
SELECT LAST_INSERT_ID();

-- PostgreSQL: egy lépésben, akár a teljes rekordot
INSERT INTO users (email) VALUES ('anna@pelda.hu') RETURNING id, email;
```

## 5. Automatikus azonosítók (sorozatok)

| Helyzet                               | MySQL                                               | PostgreSQL                                                                                                                                              |
| ------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| kézzel megadott `id`-k beszúrása után | az `AUTO_INCREMENT` magától a max + 1-re ugrik      | a sorozat **nem** igazodik, 1-ről folytatja: amint egy már foglalt `id`-hez ér, a beszúrás `duplicate key ... _pkey` hibát ad, ezért `setval(...)` kell |
| tábla kiürítése                       | `TRUNCATE t` az `AUTO_INCREMENT`-et is 1-re állítja | `TRUNCATE t RESTART IDENTITY` (a `RESTART IDENTITY` nélkül a számlálás folytatódik)                                                                     |
| `DELETE FROM t`                       | a számláló folytatódik                              | a számláló folytatódik                                                                                                                                  |

```sql
-- PostgreSQL: sorozat igazítása kézi id-k után
SELECT setval(pg_get_serial_sequence('films', 'id'), (SELECT max(id) FROM films));
```

## 6. Hibakódok

| Hiba                          | MySQL (`errno`, SQLSTATE) | PostgreSQL (`sqlState`, Prisma 8 `error.sqlState`) |
| ----------------------------- | ------------------------- | -------------------------------------------------- |
| egyedi érték ütközés          | `1062`, `23000`           | `23505`                                            |
| nem létező hivatkozott rekord | `1452`, `23000`           | `23503`                                            |
| hivatkozott rekord törlése    | `1451`, `23000`           | `23503`                                            |
| kötelező mező hiányzik        | `1048`, `23000`           | `23502`                                            |
| túl hosszú szöveg             | `1406`, `22001`           | `22001`                                            |
| `CHECK` megszorítás           | `3819`, `HY000`           | `23514`                                            |

> A PostgreSQL minden hibához külön SQLSTATE kódot ad, ezért a route-okban ez alapján lehet
> HTTP státuszt választani (`23505` → 409, `23503` → 409/400).

## 7. Adatbázis bejárása parancssorból

| Mire?                | MySQL (`mysql`)           | PostgreSQL (`psql`)          |
| -------------------- | ------------------------- | ---------------------------- |
| adatbázisok listája  | `SHOW DATABASES;`         | `\l`                         |
| adatbázis váltása    | `USE mydb;`               | `\c mydb`                    |
| táblák listája       | `SHOW TABLES;`            | `\dt`                        |
| tábla szerkezete     | `DESCRIBE users;`         | `\d users`                   |
| kilépés              | `exit`                    | `\q`                         |
| SQL script futtatása | `mysql mydb < script.sql` | `psql -d mydb -f script.sql` |

> PostgreSQL-ben egy lekérdezés nem érhet át másik adatbázisba (MySQL-ben a
> `SELECT * FROM masikdb.tabla` működik). Egy adatbázison belül a táblák **sémákba**
> rendezhetők; alapból minden a `public` sémába kerül.

## 8. Tranzakciók és szerkezetmódosítás

```sql
-- PostgreSQL: a szerkezetmódosítás is visszavonható
BEGIN;
ALTER TABLE films ADD COLUMN hossz integer;
DROP TABLE posts;
ROLLBACK;  -- az oszlop nem jön létre, a posts tábla megmarad
```

MySQL-ben a `CREATE`, `ALTER`, `DROP` azonnal véglegesít (implicit `COMMIT`), a fenti
`ROLLBACK` nem állítja vissza őket.

## 9. Mit jelent ez a Prisma 8 sablonban?

- A sablon PostgreSQL-re készült (`@prisma/orm-postgres`). A Prisma 8 MySQL-hez külön csomagot ad
  (`@prisma/orm-mysql`); a contract és a lekérdező API nagyrészt ugyanaz, de a típusok és a
  hibakódok a fentiek szerint eltérnek.
- A route-okban a Prisma lekérdező API (`db.orm.public.Film...`) mindkét adatbázison ugyanúgy
  néz ki, a különbség a **nyers SQL-ben** (`db.raw.sql`), a **hibakódokban** (`sqlState`) és a
  **típusokban** (pl. `boolean`, tömbök, `timestamptz`) jön elő.
- A kis-/nagybetű érzékenység a Prisma szűrőinél is számít: PostgreSQL-ben a `.like("%egri%")`
  nem találja meg az „Egri csillagok”-at, ehhez `.ilike(...)` kell.
- A kézzel megadott `id`-jű minta adatok után a PostgreSQL-ben a sorozatot igazítani kell (5.
  pont), a seed ezért használ `TRUNCATE ... RESTART IDENTITY`-t.
