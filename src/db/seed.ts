import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { tiposFollowup } from "./schema.js";

const TIPOS_PADRAO = [
  { slug: "briefing", descricao: "Briefing do projeto", padrao: true },
  { slug: "acessos", descricao: "Acessos e credenciais", padrao: true },
  { slug: "hospedagem", descricao: "Dados de hospedagem", padrao: true },
  { slug: "validacao", descricao: "Validação de entrega", padrao: true },
  { slug: "conteudo", descricao: "Conteúdo e materiais", padrao: true },
];

export function seedTiposPadrao(db: BaseSQLiteDatabase<"sync", void>): void {
  for (const tipo of TIPOS_PADRAO) {
    db.insert(tiposFollowup).values(tipo).onConflictDoNothing().run();
  }
}
