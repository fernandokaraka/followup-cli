import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { loadTemplates, saveTemplates, type Template, type TemplateItem } from "../db/templates.js";
import { addFollowup } from "./followup.js";

export function createTemplate(
  name: string,
  descricao: string,
  items: TemplateItem[]
): void {
  const templates = loadTemplates();
  if (templates[name]) throw new Error(`Template "${name}" já existe.`);
  templates[name] = { descricao, items };
  saveTemplates(templates);
}

export function listTemplates(): Record<string, Template> {
  return loadTemplates();
}

export function getTemplate(name: string): Template | null {
  const templates = loadTemplates();
  return templates[name] ?? null;
}

export function removeTemplate(name: string): void {
  const templates = loadTemplates();
  if (!templates[name]) throw new Error(`Template "${name}" não encontrado.`);
  delete templates[name];
  saveTemplates(templates);
}

export function applyTemplate(
  db: BaseSQLiteDatabase<"sync", void>,
  templateName: string,
  clienteId: number,
  urgenciaOverride?: "alta" | "media" | "baixa"
): number {
  const template = getTemplate(templateName);
  if (!template) throw new Error(`Template "${templateName}" não encontrado.`);

  let count = 0;
  for (const item of template.items) {
    addFollowup(db, {
      clienteId,
      tipoSlug: item.tipo,
      descricao: item.descricao,
      urgencia: urgenciaOverride ?? item.urgencia,
    });
    count++;
  }
  return count;
}
