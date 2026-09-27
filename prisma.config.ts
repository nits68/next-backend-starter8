import "dotenv/config";
import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./prisma/contract.prisma",
    db: {
      // a CLI (migrációk) a direkt kapcsolatot használja, ha van ilyen (Neon)
      connection: (process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"])!,
    },
  }),
  skills: {
    check: false, // ne jelezzen minden parancsnál az AI-ügynököknek szóló skill fájlok miatt
  },
});
