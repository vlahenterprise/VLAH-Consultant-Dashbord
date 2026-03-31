import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

export const sql = databaseUrl
  ? postgres(databaseUrl, {
      prepare: false,
      max: 1,
    })
  : null;

export function hasDatabase() {
  return Boolean(sql);
}
