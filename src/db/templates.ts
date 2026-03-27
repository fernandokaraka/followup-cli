import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface TemplateItem {
  tipo: string;
  descricao: string;
  urgencia: "alta" | "media" | "baixa";
}

export interface Template {
  descricao: string;
  items: TemplateItem[];
}

export type Templates = Record<string, Template>;

function getTemplatesPath(): string {
  return join(homedir(), ".followup", "templates.json");
}

export function loadTemplates(): Templates {
  const path = getTemplatesPath();
  if (!existsSync(path)) {
    mkdirSync(join(homedir(), ".followup"), { recursive: true });
    writeFileSync(path, "{}");
    return {};
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function saveTemplates(templates: Templates): void {
  const path = getTemplatesPath();
  mkdirSync(join(homedir(), ".followup"), { recursive: true });
  writeFileSync(path, JSON.stringify(templates, null, 2));
}
