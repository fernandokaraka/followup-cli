import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { clientes, followups } from "../db/schema.js";
import { like, eq } from "drizzle-orm";

interface AddClienteInput {
  nome: string;
  whatsapp: string;
  notas?: string;
}

interface Cliente {
  id: number;
  nome: string;
  whatsapp: string;
  notas: string | null;
  criadoEm: string;
}

export function addCliente(db: BaseSQLiteDatabase<"sync", void>, input: AddClienteInput): Cliente {
  const result = db
    .insert(clientes)
    .values({
      nome: input.nome,
      whatsapp: input.whatsapp,
      notas: input.notas ?? null,
    })
    .returning()
    .get();

  return result;
}

export function listClientes(db: BaseSQLiteDatabase<"sync", void>): Cliente[] {
  return db.select().from(clientes).all();
}

export function findCliente(db: BaseSQLiteDatabase<"sync", void>, search: string): Cliente | null {
  const matches = db
    .select()
    .from(clientes)
    .where(like(clientes.nome, `%${search}%`))
    .all();

  if (matches.length === 0) return null;
  if (matches.length > 1) {
    const names = matches.map((c) => c.nome).join(", ");
    throw new Error(`Múltiplos clientes encontrados: ${names}. Seja mais específico.`);
  }
  return matches[0];
}

export function editCliente(
  db: BaseSQLiteDatabase<"sync", void>,
  id: number,
  updates: { nome?: string; whatsapp?: string }
): void {
  const matches = db.select().from(clientes).where(eq(clientes.id, id)).all();
  if (matches.length === 0) throw new Error(`Cliente #${id} não encontrado.`);

  const setObj: Record<string, string> = {};
  if (updates.nome) setObj.nome = updates.nome;
  if (updates.whatsapp) setObj.whatsapp = updates.whatsapp;

  if (Object.keys(setObj).length > 0) {
    db.update(clientes).set(setObj).where(eq(clientes.id, id)).run();
  }
}

export function removeCliente(
  db: BaseSQLiteDatabase<"sync", void>,
  id: number
): void {
  const matches = db.select().from(clientes).where(eq(clientes.id, id)).all();
  if (matches.length === 0) throw new Error(`Cliente #${id} não encontrado.`);

  // Check for linked followups
  const linked = db.select().from(followups).where(eq(followups.clienteId, id)).all();
  if (linked.length > 0) {
    throw new Error(`Cliente tem ${linked.length} follow-ups vinculados. Remova-os primeiro.`);
  }

  db.delete(clientes).where(eq(clientes.id, id)).run();
}
