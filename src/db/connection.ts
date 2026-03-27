import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { seedTiposPadrao } from "./seed.js";

let _db: BaseSQLiteDatabase<"sync", void> | null = null;
let _sqlite: SqlJsDatabase | null = null;
let _dbPath: string | null = null;

export async function getDb(dbPath?: string): Promise<BaseSQLiteDatabase<"sync", void>> {
  if (_db) return _db;

  const resolvedPath = dbPath ?? join(homedir(), ".followup", "data.db");
  if (!dbPath) {
    mkdirSync(join(homedir(), ".followup"), { recursive: true });
  }

  const SQL = await initSqlJs();
  let sqlite: SqlJsDatabase;
  if (existsSync(resolvedPath)) {
    const fileBuffer = readFileSync(resolvedPath);
    sqlite = new SQL.Database(fileBuffer);
  } else {
    sqlite = new SQL.Database();
  }

  sqlite.run("PRAGMA foreign_keys = ON");
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      notas TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tipos_followup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      descricao TEXT NOT NULL,
      padrao INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      tipo_slug TEXT NOT NULL,
      descricao TEXT NOT NULL,
      urgencia TEXT NOT NULL DEFAULT 'media',
      status TEXT NOT NULL DEFAULT 'pendente',
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      concluido_em TEXT
    );
    CREATE TABLE IF NOT EXISTS cobrancas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      followup_id INTEGER NOT NULL REFERENCES followups(id),
      data TEXT NOT NULL DEFAULT (datetime('now')),
      nota TEXT
    );
  `);

  _db = drizzle(sqlite);
  _sqlite = sqlite;
  _dbPath = resolvedPath;
  seedTiposPadrao(_db);
  return _db;
}

export function saveDb(): void {
  if (_sqlite && _dbPath) {
    const data = _sqlite.export();
    const buffer = Buffer.from(data);
    writeFileSync(_dbPath, buffer);
  }
}

export function resetDb(): void {
  _db = null;
  _sqlite = null;
  _dbPath = null;
}
