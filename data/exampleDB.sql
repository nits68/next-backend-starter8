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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email      TEXT        NOT NULL,
  name       TEXT,
  updated_at TIMESTAMPTZ NOT NULL, -- a Prisma tölti ki (@onCreate / @onUpdate), itt az INSERT
  username   TEXT,
  CONSTRAINT author_pkey PRIMARY KEY (id),
  CONSTRAINT author_email_key UNIQUE (email) -- @unique
);

-- Cikkek (model Article → tábla: article), 1:N kapcsolat: egy szerzőnek több cikke lehet
CREATE TABLE article (
  id         SERIAL      NOT NULL,
  author_id  INTEGER     NOT NULL,
  content    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT article_pkey PRIMARY KEY (id),
  CONSTRAINT article_author_id_fkey FOREIGN KEY (author_id) REFERENCES author (id)
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
INSERT INTO article (id, author_id, title, content, updated_at) VALUES
  (1, 1, 'Kedvenc magyar filmem', 'A Körhinta minden alkalommal megríkat.', now()),
  (2, 1, 'Filmklub csütörtökön', 'A tanú lesz a következő film.', now()),
  (3, 1, 'Klasszikusok hétvégére', NULL, now()),
  (4, 2, 'Macskafogó újranézve', 'Felnőttként is ugyanolyan jó.', now()),
  (5, 2, 'Animációs filmek listája', 'Vuk, Macskafogó, Fehérlófia.', now()),
  (6, 3, 'Saul fia élmény', 'Nehéz, de fontos film.', now()),
  (7, 4, 'Üvegtigris idézetek', 'Melyik a kedvencetek?', now()),
  (8, 4, 'Vígjátékok estére', NULL, now()),
  (9, 5, 'Kontroll forgatási helyszínek', 'A budapesti metróban forgott.', now()),
  (10, 6, 'Egri csillagok: könyv vagy film?', 'Szerintem a könyv jobb.', now()),
  (11, 7, 'Testről és lélekről', 'Különleges hangulatú film.', now()),
  (12, 7, 'Romantikus filmek', NULL, now()),
  (13, 8, 'Háborús drámák', 'Az ötödik pecsét és a Valahol Európában.', now()),
  (14, 9, 'Régi magyar vígjátékok', 'Hyppolit, a lakáj - örök klasszikus.', now()),
  (15, 10, 'Csinibaba zenéi', 'A dalokat ma is dúdolom.', now()),
  (16, 11, 'Szindbád és a gasztronómia', 'A húsleves-jelenet legendás.', now()),
  (17, 12, 'Mephisto - Oscar-díj', '1982-ben nyert Oscart.', now()),
  (18, 13, 'Első bejegyzésem', 'Sziasztok!', now()),
  (19, 14, 'Ajánlás hétvégére', 'Indul a bakterház!', now()),
  (20, 14, 'Jókai-feldolgozások', 'A kőszívű ember fiai is nagyon jó.', now());

-- Mivel az id-ket kézzel adtuk meg, az id sorozat (sequence) nem lépett tovább.
-- Beállítjuk a legnagyobb id-re, így a következő automatikus id max + 1 lesz (nem 1).
SELECT setval(pg_get_serial_sequence('author', 'id'), (SELECT MAX(id) FROM author));
SELECT setval(pg_get_serial_sequence('article', 'id'), (SELECT MAX(id) FROM article));

COMMIT;
