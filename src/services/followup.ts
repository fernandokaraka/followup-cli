import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { followups, cobrancas, clientes } from "../db/schema.js";
import { eq, and, ne } from "drizzle-orm";

interface AddFollowupInput {
  clienteId: number;
  tipoSlug: string;
  descricao: string;
  urgencia?: "alta" | "media" | "baixa";
}

interface ListFilters {
  clienteId?: number;
  urgencia?: "alta" | "media" | "baixa";
  includeConcluido?: boolean;
}

interface FollowupRow {
  id: number;
  clienteId: number;
  tipoSlug: string;
  descricao: string;
  urgencia: string;
  status: string;
  criadoEm: string;
  concluidoEm: string | null;
}

interface FollowupWithCliente extends FollowupRow {
  clienteNome: string;
  totalCobrancas: number;
}

interface CobrancaRow {
  id: number;
  followupId: number;
  data: string;
  nota: string | null;
}

export function addFollowup(db: BaseSQLiteDatabase<"sync", void>, input: AddFollowupInput): FollowupRow {
  return db
    .insert(followups)
    .values({
      clienteId: input.clienteId,
      tipoSlug: input.tipoSlug,
      descricao: input.descricao,
      urgencia: input.urgencia ?? "media",
    })
    .returning()
    .get();
}

export function getFollowup(db: BaseSQLiteDatabase<"sync", void>, id: number): FollowupRow | undefined {
  return db.select().from(followups).where(eq(followups.id, id)).get();
}

export function listFollowups(
  db: BaseSQLiteDatabase<"sync", void>,
  filters: ListFilters
): FollowupWithCliente[] {
  const conditions = [];

  if (!filters.includeConcluido) {
    conditions.push(ne(followups.status, "concluido"));
  }
  if (filters.clienteId) {
    conditions.push(eq(followups.clienteId, filters.clienteId));
  }
  if (filters.urgencia) {
    conditions.push(eq(followups.urgencia, filters.urgencia));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = db
    .select({
      id: followups.id,
      clienteId: followups.clienteId,
      clienteNome: clientes.nome,
      tipoSlug: followups.tipoSlug,
      descricao: followups.descricao,
      urgencia: followups.urgencia,
      status: followups.status,
      criadoEm: followups.criadoEm,
      concluidoEm: followups.concluidoEm,
    })
    .from(followups)
    .innerJoin(clientes, eq(followups.clienteId, clientes.id))
    .where(where)
    .all();

  return rows.map((row) => {
    const cobCount = db
      .select()
      .from(cobrancas)
      .where(eq(cobrancas.followupId, row.id))
      .all().length;

    return { ...row, totalCobrancas: cobCount };
  });
}

export function cobrar(
  db: BaseSQLiteDatabase<"sync", void>,
  followupId: number,
  nota?: string
): CobrancaRow {
  const fu = getFollowup(db, followupId);
  if (!fu) throw new Error(`Follow-up #${followupId} não encontrado.`);

  db.update(followups)
    .set({ status: "cobrado" })
    .where(eq(followups.id, followupId))
    .run();

  return db
    .insert(cobrancas)
    .values({ followupId, nota: nota ?? null })
    .returning()
    .get();
}

export function done(
  db: BaseSQLiteDatabase<"sync", void>,
  followupId: number,
  nota?: string
): void {
  const fu = getFollowup(db, followupId);
  if (!fu) throw new Error(`Follow-up #${followupId} não encontrado.`);

  db.update(followups)
    .set({
      status: "concluido",
      concluidoEm: new Date().toISOString(),
    })
    .where(eq(followups.id, followupId))
    .run();

  if (nota) {
    db.insert(cobrancas)
      .values({ followupId, nota })
      .run();
  }
}

export function historico(
  db: BaseSQLiteDatabase<"sync", void>,
  followupId: number
): CobrancaRow[] {
  return db
    .select()
    .from(cobrancas)
    .where(eq(cobrancas.followupId, followupId))
    .orderBy(cobrancas.data)
    .all();
}

export function editFollowup(
  db: BaseSQLiteDatabase<"sync", void>,
  id: number,
  updates: { descricao?: string; urgencia?: "alta" | "media" | "baixa"; tipoSlug?: string }
): void {
  const fu = getFollowup(db, id);
  if (!fu) throw new Error(`Follow-up #${id} não encontrado.`);

  const setObj: Record<string, string> = {};
  if (updates.descricao) setObj.descricao = updates.descricao;
  if (updates.urgencia) setObj.urgencia = updates.urgencia;
  if (updates.tipoSlug) setObj.tipoSlug = updates.tipoSlug;

  if (Object.keys(setObj).length > 0) {
    db.update(followups).set(setObj).where(eq(followups.id, id)).run();
  }
}

export function removeFollowup(
  db: BaseSQLiteDatabase<"sync", void>,
  id: number
): void {
  const fu = getFollowup(db, id);
  if (!fu) throw new Error(`Follow-up #${id} não encontrado.`);

  // Delete cobrancas first (cascade)
  db.delete(cobrancas).where(eq(cobrancas.followupId, id)).run();
  db.delete(followups).where(eq(followups.id, id)).run();
}
