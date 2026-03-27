import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const clientes = sqliteTable("clientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  whatsapp: text("whatsapp").notNull(),
  notas: text("notas"),
  criadoEm: text("criado_em")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const tiposFollowup = sqliteTable("tipos_followup", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  descricao: text("descricao").notNull(),
  padrao: integer("padrao", { mode: "boolean" }).notNull().default(false),
});

export const followups = sqliteTable("followups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id),
  tipoSlug: text("tipo_slug").notNull(),
  descricao: text("descricao").notNull(),
  urgencia: text("urgencia", { enum: ["alta", "media", "baixa"] })
    .notNull()
    .default("media"),
  status: text("status", { enum: ["pendente", "cobrado", "concluido"] })
    .notNull()
    .default("pendente"),
  criadoEm: text("criado_em")
    .notNull()
    .default(sql`(datetime('now'))`),
  concluidoEm: text("concluido_em"),
});

export const cobrancas = sqliteTable("cobrancas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  followupId: integer("followup_id")
    .notNull()
    .references(() => followups.id),
  data: text("data")
    .notNull()
    .default(sql`(datetime('now'))`),
  nota: text("nota"),
});
