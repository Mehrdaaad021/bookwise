// src/db/index.ts
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import { requireEnv } from "../lib/env";

const connectionString = requireEnv("DATABASE_URL");
const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
export type Database = typeof db;