import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

const contract = contractFromJson<Contract>(contractJson);

const createDb = () => postgres({ contract, url: process.env["DATABASE_URL"]! });
type Db = ReturnType<typeof createDb>;

// Egyetlen kliens példány a Next.js hot reload miatt. Ha a contract megváltozik
// (prisma contract emit), új kliens készül, a régi kapcsolatai lezárulnak.
const globalForDb = globalThis as unknown as { db?: Db; dbContractHash?: string };
const contractHash = contractJson.storage.storageHash;

if (!globalForDb.db || globalForDb.dbContractHash !== contractHash) {
  void globalForDb.db?.close();
  globalForDb.db = createDb();
  globalForDb.dbContractHash = contractHash;
}

export const db = globalForDb.db;
export default db;
