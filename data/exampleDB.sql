-- exampleDB.sql
-- A prisma/contract.prisma (táblák) és a prisma/seed.ts (mintaadatok) SQL megfelelője.
-- Prisma nélkül is létrehozza és feltölti az author és article táblákat.
--
-- Futtatás (pl. psql-lel, egy már létező adatbázison):
--   psql -h localhost -p 5432 -U postgres -d <ADATBÁZIS> -f data/exampleDB.sql
-- vagy pgAdmin Query Tool-ban, vagy NEON SQL Editor-ban megnyitva és futtatva.
--
-- FIGYELEM: a script TÖRLI a meglévő author és article táblákat (az adataikkal együtt)!
-- Ha utána a Prisma is használja az adatbázist, futtasd: npm run contract:emit, majd npm run db:sign

BEGIN;

-- Régi táblák törlése (előbb a hivatkozó article, aztán az author)
DROP TABLE IF EXISTS article;
DROP TABLE IF EXISTS author;

-- Szerzők (model Author → tábla: author)
CREATE TABLE author (
  id         SERIAL      NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  email      TEXT        NOT NULL,
  name       TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL, -- a Prisma tölti ki (@onCreate / @onUpdate), itt az INSERT
  username   TEXT,
  CONSTRAINT author_pkey PRIMARY KEY (id),
  CONSTRAINT author_email_key UNIQUE (email), -- @unique
  -- @@check: egyszerű e-mail-forma; a név végén lévő hash-t a Prisma generálja
  CONSTRAINT author_email_format_58ffc0a7 CHECK (email LIKE '%_@_%._%')
);

-- Cikkek (model Article → tábla: article), 1:N kapcsolat: egy szerzőnek több cikke lehet
CREATE TABLE article (
  id         SERIAL      NOT NULL,
  author_id  INTEGER     NOT NULL,
  content    TEXT,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  title      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  -- opcionális mezők (NULL is lehet): logikai, szám, dátum-idő
  published    BOOLEAN,
  rating       INTEGER,
  published_at TIMESTAMPTZ(3),
  CONSTRAINT article_pkey PRIMARY KEY (id),
  CONSTRAINT article_author_id_fkey FOREIGN KEY (author_id) REFERENCES author (id),
  -- @@check: az értékelés 1 és 5 között (NULL megengedett)
  CONSTRAINT article_rating_range_5123b83d CHECK (rating BETWEEN 1 AND 5),
  -- @@check: ha nincs közzétéve (published = false), nem lehet közzétételi dátuma
  CONSTRAINT article_published_date_16a68b68 CHECK (published OR published_at IS NULL)
);

-- Index az idegen kulcsra (@@index([authorId])); a nevet a Prisma generálja
CREATE INDEX article_author_id_idx_f3862461 ON article (author_id);

-- Minta szerzők (az email egyedi); az id-t is mi adjuk meg
INSERT INTO author (id, email, username, name, updated_at) VALUES
  (1, 'kiss.anna@pelda.hu', 'kanna', 'Kiss Anna', now()),
  (2, 'nagy.peter@pelda.hu', 'npeter', 'Nagy Péter', now()),
  (3, 'szabo.eszter@pelda.hu', 'szeszter', 'Szabó Eszter', now()),
  (4, 'toth.gabor@pelda.hu', 'tgabor', 'Tóth Gábor', now()),
  (5, 'horvath.lilla@pelda.hu', 'hlilla', 'Horváth Lilla', now()),
  (6, 'varga.bence@pelda.hu', 'vbence', 'Varga Bence', now()),
  (7, 'kovacs.reka@pelda.hu', 'kreka', 'Kovács Réka', now()),
  (8, 'molnar.adam@pelda.hu', 'madam', 'Molnár Ádám', now()),
  (9, 'farkas.zsofia@pelda.hu', 'fzsofia', 'Farkas Zsófia', now()),
  (10, 'balogh.mate@pelda.hu', 'bmate', 'Balogh Máté', now()),
  (11, 'papp.noemi@pelda.hu', 'pnoemi', 'Papp Noémi', now()),
  (12, 'lakatos.daniel@pelda.hu', 'ldaniel', 'Lakatos Dániel', now()),
  (13, 'simon.petra@pelda.hu', NULL, 'Simon Petra', now()),
  (14, 'fekete.levente@pelda.hu', NULL, 'Fekete Levente', now()),
  (15, 'vendeg@pelda.hu', 'vendeg', NULL, now());

-- Minta cikkek: az id-t és a szerző id-jét (author_id, idegen kulcs) is mi adjuk meg
-- published / rating / published_at opcionális; a dátum-idő UTC-ben (+00) megadva
INSERT INTO article (id, author_id, title, content, published, rating, published_at, updated_at) VALUES
  (1, 1, 'Kedvenc magyar filmem', 'A Körhinta minden alkalommal megríkat.', TRUE, 5, '2026-01-10 09:00:00+00', now()),
  (2, 1, 'Filmklub csütörtökön', 'A tanú lesz a következő film.', TRUE, 4, '2026-01-12 18:30:00+00', now()),
  (3, 1, 'Klasszikusok hétvégére', NULL, FALSE, NULL, NULL, now()),
  (4, 2, 'Macskafogó újranézve', 'Felnőttként is ugyanolyan jó.', TRUE, 5, '2026-02-01 08:00:00+00', now()),
  (5, 2, 'Animációs filmek listája', 'Vuk, Macskafogó, Fehérlófia.', TRUE, 3, '2026-02-03 12:00:00+00', now()),
  (6, 3, 'Saul fia élmény', 'Nehéz, de fontos film.', TRUE, 5, '2026-02-14 20:00:00+00', now()),
  (7, 4, 'Üvegtigris idézetek', 'Melyik a kedvencetek?', TRUE, 4, '2026-03-01 10:15:00+00', now()),
  (8, 4, 'Vígjátékok estére', NULL, FALSE, NULL, NULL, now()),
  (9, 5, 'Kontroll forgatási helyszínek', 'A budapesti metróban forgott.', TRUE, 4, '2026-03-20 07:45:00+00', now()),
  (10, 6, 'Egri csillagok: könyv vagy film?', 'Szerintem a könyv jobb.', TRUE, 2, '2026-04-02 16:00:00+00', now()),
  (11, 7, 'Testről és lélekről', 'Különleges hangulatú film.', TRUE, 5, '2026-04-18 19:30:00+00', now()),
  (12, 7, 'Romantikus filmek', NULL, NULL, NULL, NULL, now()),
  (13, 8, 'Háborús drámák', 'Az ötödik pecsét és a Valahol Európában.', TRUE, 4, '2026-05-05 11:00:00+00', now()),
  (14, 9, 'Régi magyar vígjátékok', 'Hyppolit, a lakáj - örök klasszikus.', TRUE, 3, '2026-05-21 14:20:00+00', now()),
  (15, 10, 'Csinibaba zenéi', 'A dalokat ma is dúdolom.', TRUE, NULL, '2026-06-10 09:00:00+00', now()),
  (16, 11, 'Szindbád és a gasztronómia', 'A húsleves-jelenet legendás.', TRUE, 4, '2026-07-01 17:00:00+00', now()),
  (17, 12, 'Mephisto - Oscar-díj', '1982-ben nyert Oscart.', TRUE, 5, '2026-08-20 10:00:00+00', now()),
  (18, 13, 'Első bejegyzésem', 'Sziasztok!', FALSE, NULL, NULL, now()),
  (19, 14, 'Ajánlás hétvégére', 'Indul a bakterház!', NULL, 1, NULL, now()),
  (20, 14, 'Jókai-feldolgozások', 'A kőszívű ember fiai is nagyon jó.', TRUE, 4, '2026-10-05 08:30:00+00', now());

-- Mivel az id-ket kézzel adtuk meg, az id sorozat (sequence) nem lépett tovább.
-- Beállítjuk a legnagyobb id-re, így a következő automatikus id max + 1 lesz (nem 1).
SELECT setval(pg_get_serial_sequence('author', 'id'), (SELECT MAX(id) FROM author));
SELECT setval(pg_get_serial_sequence('article', 'id'), (SELECT MAX(id) FROM article));

COMMIT;
