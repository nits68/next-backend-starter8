// A Prisma CLI indítása nagybetűs meghajtójellel (Windows: "e:\..." helyett "E:\...").
// A Prisma 8 CLI kisbetűs meghajtójelnél CLI.CONFIG_UNREADABLE hibát ad.
import { spawnSync } from "node:child_process";
import process from "node:process";

const cwd = process.cwd().replace(/^[a-z](?=:)/, (d) => d.toUpperCase());
const result = spawnSync("prisma", process.argv.slice(2), { cwd, stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
