import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { seedTiposPadrao } from "../src/db/seed.js";

export async function createTestDb(): Promise<BaseSQLiteDatabase<"sync", void>> {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  sqlite.run("PRAGMA foreign_keys = ON");
  sqlite.run(`
    CREATE TABLE clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      notas TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE tipos_followup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      descricao TEXT NOT NULL,
      padrao INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      tipo_slug TEXT NOT NULL,
      descricao TEXT NOT NULL,
      urgencia TEXT NOT NULL DEFAULT 'media',
      status TEXT NOT NULL DEFAULT 'pendente',
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      concluido_em TEXT
    );
    CREATE TABLE cobrancas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      followup_id INTEGER NOT NULL REFERENCES followups(id),
      data TEXT NOT NULL DEFAULT (datetime('now')),
      nota TEXT
    );
  `);
  const db = drizzle(sqlite);
  seedTiposPadrao(db);
  return db;
}
