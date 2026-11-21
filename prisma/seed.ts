/* eslint-disable no-console */

import { db } from "./db";

// Minta szerzők (az email egyedi, @unique); az id-t is mi adjuk meg
const AUTHORS = [
  { id: 1, email: "kiss.anna@pelda.hu", username: "kanna", name: "Kiss Anna" },
  { id: 2, email: "nagy.peter@pelda.hu", username: "npeter", name: "Nagy Péter" },
  { id: 3, email: "szabo.eszter@pelda.hu", username: "szeszter", name: "Szabó Eszter" },
  { id: 4, email: "toth.gabor@pelda.hu", username: "tgabor", name: "Tóth Gábor" },
  { id: 5, email: "horvath.lilla@pelda.hu", username: "hlilla", name: "Horváth Lilla" },
  { id: 6, email: "varga.bence@pelda.hu", username: "vbence", name: "Varga Bence" },
  { id: 7, email: "kovacs.reka@pelda.hu", username: "kreka", name: "Kovács Réka" },
  { id: 8, email: "molnar.adam@pelda.hu", username: "madam", name: "Molnár Ádám" },
  { id: 9, email: "farkas.zsofia@pelda.hu", username: "fzsofia", name: "Farkas Zsófia" },
  { id: 10, email: "balogh.mate@pelda.hu", username: "bmate", name: "Balogh Máté" },
  { id: 11, email: "papp.noemi@pelda.hu", username: "pnoemi", name: "Papp Noémi" },
  { id: 12, email: "lakatos.daniel@pelda.hu", username: "ldaniel", name: "Lakatos Dániel" },
  { id: 13, email: "simon.petra@pelda.hu", username: null, name: "Simon Petra" },
  { id: 14, email: "fekete.levente@pelda.hu", username: null, name: "Fekete Levente" },
  { id: 15, email: "vendeg@pelda.hu", username: "vendeg", name: null },
];

// Minta cikkek: az id-t és a szerző id-jét (authorId, idegen kulcs) is mi adjuk meg.
// Opcionális mezők: published (közzétéve-e), rating (értékelés 1-5), publishedAt (közzététel ideje).
// A CHECK szabályok miatt: rating csak 1-5 vagy null; ha published false, publishedAt csak null lehet.
// A TimestamptzJsDate mező csak Date objektumot fogad el (szöveget nem).
const ARTICLES = [
  {
    id: 1,
    authorId: 1,
    title: "Kedvenc magyar filmem",
    content: "A Körhinta minden alkalommal megríkat.",
    published: true,
    rating: 5,
    publishedAt: new Date("2026-01-10T09:00:00Z"),
  },
  {
    id: 2,
    authorId: 1,
    title: "Filmklub csütörtökön",
    content: "A tanú lesz a következő film.",
    published: true,
    rating: 4,
    publishedAt: new Date("2026-01-12T18:30:00Z"),
  },
  {
    id: 3,
    authorId: 1,
    title: "Klasszikusok hétvégére",
    content: null,
    published: false,
    rating: null,
    publishedAt: null,
  },
  {
    id: 4,
    authorId: 2,
    title: "Macskafogó újranézve",
    content: "Felnőttként is ugyanolyan jó.",
    published: true,
    rating: 5,
    publishedAt: new Date("2026-02-01T08:00:00Z"),
  },
  {
    id: 5,
    authorId: 2,
    title: "Animációs filmek listája",
    content: "Vuk, Macskafogó, Fehérlófia.",
    published: true,
    rating: 3,
    publishedAt: new Date("2026-02-03T12:00:00Z"),
  },
  {
    id: 6,
    authorId: 3,
    title: "Saul fia élmény",
    content: "Nehéz, de fontos film.",
    published: true,
    rating: 5,
    publishedAt: new Date("2026-02-14T20:00:00Z"),
  },
  {
    id: 7,
    authorId: 4,
    title: "Üvegtigris idézetek",
    content: "Melyik a kedvencetek?",
    published: true,
    rating: 4,
    publishedAt: new Date("2026-03-01T10:15:00Z"),
  },
  {
    id: 8,
    authorId: 4,
    title: "Vígjátékok estére",
    content: null,
    published: false,
    rating: null,
    publishedAt: null,
  },
  {
    id: 9,
    authorId: 5,
    title: "Kontroll forgatási helyszínek",
    content: "A budapesti metróban forgott.",
    published: true,
    rating: 4,
    publishedAt: new Date("2026-03-20T07:45:00Z"),
  },
  {
    id: 10,
    authorId: 6,
    title: "Egri csillagok: könyv vagy film?",
    content: "Szerintem a könyv jobb.",
    published: true,
    rating: 2,
    publishedAt: new Date("2026-04-02T16:00:00Z"),
  },
  {
    id: 11,
    authorId: 7,
    title: "Testről és lélekről",
    content: "Különleges hangulatú film.",
    published: true,
    rating: 5,
    publishedAt: new Date("2026-04-18T19:30:00Z"),
  },
  {
    id: 12,
    authorId: 7,
    title: "Romantikus filmek",
    content: null,
    published: null,
    rating: null,
    publishedAt: null,
  },
  {
    id: 13,
    authorId: 8,
    title: "Háborús drámák",
    content: "Az ötödik pecsét és a Valahol Európában.",
    published: true,
    rating: 4,
    publishedAt: new Date("2026-05-05T11:00:00Z"),
  },
  {
    id: 14,
    authorId: 9,
    title: "Régi magyar vígjátékok",
    content: "Hyppolit, a lakáj - örök klasszikus.",
    published: true,
    rating: 3,
    publishedAt: new Date("2026-05-21T14:20:00Z"),
  },
  {
    id: 15,
    authorId: 10,
    title: "Csinibaba zenéi",
    content: "A dalokat ma is dúdolom.",
    published: true,
    rating: null,
    publishedAt: new Date("2026-06-10T09:00:00Z"),
  },
  {
    id: 16,
    authorId: 11,
    title: "Szindbád és a gasztronómia",
    content: "A húsleves-jelenet legendás.",
    published: true,
    rating: 4,
    publishedAt: new Date("2026-07-01T17:00:00Z"),
  },
  {
    id: 17,
    authorId: 12,
    title: "Mephisto - Oscar-díj",
    content: "1982-ben nyert Oscart.",
    published: true,
    rating: 5,
    publishedAt: new Date("2026-08-20T10:00:00Z"),
  },
  {
    id: 18,
    authorId: 13,
    title: "Első bejegyzésem",
    content: "Sziasztok!",
    published: false,
    rating: null,
    publishedAt: null,
  },
  {
    id: 19,
    authorId: 14,
    title: "Ajánlás hétvégére",
    content: "Indul a bakterház!",
    published: null,
    rating: 1,
    publishedAt: null,
  },
  {
    id: 20,
    authorId: 14,
    title: "Jókai-feldolgozások",
    content: "A kőszívű ember fiai is nagyon jó.",
    published: true,
    rating: 4,
    publishedAt: new Date("2026-10-05T08:30:00Z"),
  },
];

async function main() {
  // Minden tábla kiürítése, és az id sorozatok (sequence) visszaállítása 1-re, hogy újrafuttatás
  // után is 1-től kezdődjenek az id-k. (A deleteAll() csak a sorokat törli, a sorozatot nem.)
  // Nyers SQL, ezért az adatbázisbeli táblaneveket használja (article, author).
  await db.query(
    db.raw.sql`TRUNCATE TABLE article, author RESTART IDENTITY`.affectedCount().build(),
  );

  await db.orm.public.Author.createAll(AUTHORS);
  await db.orm.public.Article.createAll(ARTICLES);

  // Mivel az id-ket kézzel adtuk meg, az id sorozat (sequence) változója nem lépett tovább.
  // Beállítjuk a legnagyobb id-re, így a következő automatikus id max + 1 lesz (nem 1).
  await db.query(
    db.raw.sql`SELECT setval(pg_get_serial_sequence('author', 'id'), (SELECT MAX(id) FROM author))`
      .affectedCount()
      .build(),
  );
  await db.query(
    db.raw
      .sql`SELECT setval(pg_get_serial_sequence('article', 'id'), (SELECT MAX(id) FROM article))`
      .affectedCount()
      .build(),
  );

  console.log(`Feltöltve: ${AUTHORS.length} szerző, ${ARTICLES.length} cikk`);
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
