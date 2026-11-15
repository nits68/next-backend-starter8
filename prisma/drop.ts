/* eslint-disable no-console */

// A .env-ben megadott (DATABASE_URL) adatbázis public sémájának MINDEN tábláját törli
// (a contractban nem szereplőket is), az enum típusokkal együtt.
// Használat: npm run db:drop  (megerősítés nélkül: npm run db:drop -- --yes)
// Utána üres adatbázis: npm run db:setup

import { createInterface } from "node:readline/promises";
import { db } from "./db";

async function main() {
  // csak a szerver és az adatbázis neve, jelszó nélkül
  const url = new URL(process.env["DATABASE_URL"]!);
  const target = `${url.hostname}${url.pathname}`;

  if (!process.argv.includes("--yes")) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
      `A(z) ${target} adatbázis public sémájának MINDEN táblája törlődik. Biztos? (i/n) `,
    );
    rl.close();
    if (answer.trim().toLowerCase() !== "i") {
      console.log("Megszakítva, nem történt törlés.");
      await db.close();
      return;
    }
  }

  // Nyers SQL: a public séma összes táblája (CASCADE: a rájuk hivatkozó idegen kulcsok is),
  // majd a megmaradt enum típusok törlése
  await db.query(
    db.raw.sql`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
          EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
        END LOOP;
        FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typtype = 'e' LOOP
          EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.typname);
        END LOOP;
      END $$`
      .affectedCount()
      .build(),
  );

  console.log(`Minden tábla törölve: ${target}. Újra létrehozás: npm run db:setup`);
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
