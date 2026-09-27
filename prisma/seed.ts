/* eslint-disable no-console */

import { db } from "./db";

// Minta filmek (a title egyedi, @unique)
const filmek = [
  { title: "Körhinta", content: "dráma" },
  { title: "Egri csillagok", content: "történelmi" },
  { title: "A Pál utcai fiúk", content: "ifjúsági" },
  { title: "A tanú", content: "szatíra" },
  { title: "Szindbád", content: "dráma" },
  { title: "Macskafogó", content: "animációs" },
  { title: "Indul a bakterház", content: "vígjáték" },
  { title: "Üvegtigris", content: "vígjáték" },
  { title: "Kontroll", content: "thriller" },
  { title: "Saul fia", content: "háborús dráma" },
  { title: "Testről és lélekről", content: "romantikus dráma" },
  { title: "Mephisto", content: "dráma" },
  { title: "Az ötödik pecsét", content: "háborús dráma" },
  { title: "Hyppolit, a lakáj", content: "vígjáték" },
  { title: "Valahol Európában", content: "háborús dráma" },
  { title: "A kőszívű ember fiai", content: "történelmi" },
  { title: "Vuk", content: "animációs" },
  { title: "Csinibaba", content: "zenés vígjáték" },
];

// Minta felhasználók (az email egyedi, @unique)
const felhasznalok = [
  { email: "kiss.anna@pelda.hu", username: "kanna", name: "Kiss Anna" },
  { email: "nagy.peter@pelda.hu", username: "npeter", name: "Nagy Péter" },
  { email: "szabo.eszter@pelda.hu", username: "szeszter", name: "Szabó Eszter" },
  { email: "toth.gabor@pelda.hu", username: "tgabor", name: "Tóth Gábor" },
  { email: "horvath.lilla@pelda.hu", username: "hlilla", name: "Horváth Lilla" },
  { email: "varga.bence@pelda.hu", username: "vbence", name: "Varga Bence" },
  { email: "kovacs.reka@pelda.hu", username: "kreka", name: "Kovács Réka" },
  { email: "molnar.adam@pelda.hu", username: "madam", name: "Molnár Ádám" },
  { email: "farkas.zsofia@pelda.hu", username: "fzsofia", name: "Farkas Zsófia" },
  { email: "balogh.mate@pelda.hu", username: "bmate", name: "Balogh Máté" },
  { email: "papp.noemi@pelda.hu", username: "pnoemi", name: "Papp Noémi" },
  { email: "lakatos.daniel@pelda.hu", username: "ldaniel", name: "Lakatos Dániel" },
  { email: "simon.petra@pelda.hu", username: null, name: "Simon Petra" },
  { email: "fekete.levente@pelda.hu", username: null, name: "Fekete Levente" },
  { email: "vendeg@pelda.hu", username: "vendeg", name: null },
];

// Minta bejegyzések: a szerzőt a felhasználó emailjével adjuk meg
const bejegyzesek = [
  { szerzo: "kiss.anna@pelda.hu", title: "Kedvenc magyar filmem", content: "A Körhinta minden alkalommal megríkat." },
  { szerzo: "kiss.anna@pelda.hu", title: "Filmklub csütörtökön", content: "A tanú lesz a következő film." },
  { szerzo: "kiss.anna@pelda.hu", title: "Klasszikusok hétvégére", content: null },
  { szerzo: "nagy.peter@pelda.hu", title: "Macskafogó újranézve", content: "Felnőttként is ugyanolyan jó." },
  { szerzo: "nagy.peter@pelda.hu", title: "Animációs filmek listája", content: "Vuk, Macskafogó, Fehérlófia." },
  { szerzo: "szabo.eszter@pelda.hu", title: "Saul fia élmény", content: "Nehéz, de fontos film." },
  { szerzo: "toth.gabor@pelda.hu", title: "Üvegtigris idézetek", content: "Melyik a kedvencetek?" },
  { szerzo: "toth.gabor@pelda.hu", title: "Vígjátékok estére", content: null },
  { szerzo: "horvath.lilla@pelda.hu", title: "Kontroll forgatási helyszínek", content: "A budapesti metróban forgott." },
  { szerzo: "varga.bence@pelda.hu", title: "Egri csillagok: könyv vagy film?", content: "Szerintem a könyv jobb." },
  { szerzo: "kovacs.reka@pelda.hu", title: "Testről és lélekről", content: "Különleges hangulatú film." },
  { szerzo: "kovacs.reka@pelda.hu", title: "Romantikus filmek", content: null },
  { szerzo: "molnar.adam@pelda.hu", title: "Háborús drámák", content: "Az ötödik pecsét és a Valahol Európában." },
  { szerzo: "farkas.zsofia@pelda.hu", title: "Régi magyar vígjátékok", content: "Hyppolit, a lakáj – örök klasszikus." },
  { szerzo: "balogh.mate@pelda.hu", title: "Csinibaba zenéi", content: "A dalokat ma is dúdolom." },
  { szerzo: "papp.noemi@pelda.hu", title: "Szindbád és a gasztronómia", content: "A húsleves-jelenet legendás." },
  { szerzo: "lakatos.daniel@pelda.hu", title: "Mephisto – Oscar-díj", content: "1982-ben nyert Oscart." },
  { szerzo: "simon.petra@pelda.hu", title: "Első bejegyzésem", content: "Sziasztok!" },
  { szerzo: "fekete.levente@pelda.hu", title: "Ajánlás hétvégére", content: "Indul a bakterház!" },
  { szerzo: "fekete.levente@pelda.hu", title: "Jókai-feldolgozások", content: "A kőszívű ember fiai is nagyon jó." },
];

async function main() {
  // Törlés a hivatkozások miatt fordított sorrendben: előbb a bejegyzések, utána a felhasználók
  await db.orm.public.Post.where({}).deleteAll();
  await db.orm.public.User.where({}).deleteAll();
  await db.orm.public.Film.where({}).deleteAll();

  await db.orm.public.Film.createAll(filmek);

  // A createAll a létrehozott rekordokat adja vissza, így megkapjuk a felhasználók id-jét
  const users = await db.orm.public.User.createAll(felhasznalok);
  const idByEmail = new Map(users.map((u) => [u.email, u.id]));

  await db.orm.public.Post.createAll(
    bejegyzesek.map((e) => ({
      title: e.title,
      content: e.content,
      authorId: idByEmail.get(e.szerzo)!,
    })),
  );

  console.log(
    `Feltöltve: ${filmek.length} film, ${users.length} felhasználó, ${bejegyzesek.length} bejegyzés`,
  );
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
