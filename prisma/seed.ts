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

// Minta cikkek: az id-t és a szerző id-jét (authorId, idegen kulcs) is mi adjuk meg
const ARTICLES = [
  {
    id: 1,
    authorId: 1,
    title: "Kedvenc magyar filmem",
    content: "A Körhinta minden alkalommal megríkat.",
  },
  {
    id: 2,
    authorId: 1,
    title: "Filmklub csütörtökön",
    content: "A tanú lesz a következő film.",
  },
  { id: 3, authorId: 1, title: "Klasszikusok hétvégére", content: null },
  {
    id: 4,
    authorId: 2,
    title: "Macskafogó újranézve",
    content: "Felnőttként is ugyanolyan jó.",
  },
  {
    id: 5,
    authorId: 2,
    title: "Animációs filmek listája",
    content: "Vuk, Macskafogó, Fehérlófia.",
  },
  { id: 6, authorId: 3, title: "Saul fia élmény", content: "Nehéz, de fontos film." },
  { id: 7, authorId: 4, title: "Üvegtigris idézetek", content: "Melyik a kedvencetek?" },
  { id: 8, authorId: 4, title: "Vígjátékok estére", content: null },
  {
    id: 9,
    authorId: 5,
    title: "Kontroll forgatási helyszínek",
    content: "A budapesti metróban forgott.",
  },
  {
    id: 10,
    authorId: 6,
    title: "Egri csillagok: könyv vagy film?",
    content: "Szerintem a könyv jobb.",
  },
  {
    id: 11,
    authorId: 7,
    title: "Testről és lélekről",
    content: "Különleges hangulatú film.",
  },
  { id: 12, authorId: 7, title: "Romantikus filmek", content: null },
  {
    id: 13,
    authorId: 8,
    title: "Háborús drámák",
    content: "Az ötödik pecsét és a Valahol Európában.",
  },
  {
    id: 14,
    authorId: 9,
    title: "Régi magyar vígjátékok",
    content: "Hyppolit, a lakáj - örök klasszikus.",
  },
  { id: 15, authorId: 10, title: "Csinibaba zenéi", content: "A dalokat ma is dúdolom." },
  {
    id: 16,
    authorId: 11,
    title: "Szindbád és a gasztronómia",
    content: "A húsleves-jelenet legendás.",
  },
  {
    id: 17,
    authorId: 12,
    title: "Mephisto - Oscar-díj",
    content: "1982-ben nyert Oscart.",
  },
  { id: 18, authorId: 13, title: "Első bejegyzésem", content: "Sziasztok!" },
  { id: 19, authorId: 14, title: "Ajánlás hétvégére", content: "Indul a bakterház!" },
  {
    id: 20,
    authorId: 14,
    title: "Jókai-feldolgozások",
    content: "A kőszívű ember fiai is nagyon jó.",
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
