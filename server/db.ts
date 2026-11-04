import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run The Crochet Edit.");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
