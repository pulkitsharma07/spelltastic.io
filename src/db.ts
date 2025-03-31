import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./db/schema";

export const db = drizzle("file:local.db", { schema });
// Enable busy timeout for litestream replication to work
db.run("PRAGMA busy_timeout = 5000;");
