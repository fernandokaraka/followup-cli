import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createTemplate, listTemplates, getTemplate, removeTemplate, applyTemplate } from "../../src/services/template.js";
import { createTestDb } from "../helpers.js";
import { addCliente } from "../../src/services/cliente.js";
import { listFollowups } from "../../src/services/followup.js";
import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

// Override HOME for tests to avoid touching real templates.json
const TEST_HOME = join(tmpdir(), "followup-test-" + Date.now());

describe("template service", () => {
  let db: BaseSQLiteDatabase<"sync", void>;
  let originalHome: string;

  beforeEach(async () => {
    db = await createTestDb();
    originalHome = process.env.HOME ?? process.env.USERPROFILE ?? "";
    mkdirSync(join(TEST_HOME, ".followup"), { recursive: true });
    process.env.HOME = TEST_HOME;
    process.env.USERPROFILE = TEST_HOME;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalHome;
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  it("creates and retrieves a template", () => {
    createTemplate("site", "Projeto de website", [
      { tipo: "briefing", descricao: "Briefing", urgencia: "alta" },
      { tipo: "acessos", descricao: "Acessos", urgencia: "media" },
    ]);
    const t = getTemplate("site");
    expect(t).not.toBeNull();
    expect(t!.items).toHaveLength(2);
  });

  it("lists all templates", () => {
    createTemplate("site", "Website", [{ tipo: "briefing", descricao: "B", urgencia: "alta" }]);
    createTemplate("app", "Mobile app", [{ tipo: "acessos", descricao: "A", urgencia: "media" }]);
    const all = listTemplates();
    expect(Object.keys(all)).toHaveLength(2);
  });

  it("throws on duplicate template name", () => {
    createTemplate("site", "Website", [{ tipo: "briefing", descricao: "B", urgencia: "alta" }]);
    expect(() => createTemplate("site", "Again", [])).toThrow("já existe");
  });

  it("removes a template", () => {
    createTemplate("site", "Website", [{ tipo: "briefing", descricao: "B", urgencia: "alta" }]);
    removeTemplate("site");
    expect(getTemplate("site")).toBeNull();
  });

  it("throws when removing non-existent template", () => {
    expect(() => removeTemplate("nope")).toThrow("não encontrado");
  });

  it("applies template to a client", () => {
    createTemplate("site", "Website", [
      { tipo: "briefing", descricao: "Briefing do site", urgencia: "alta" },
      { tipo: "acessos", descricao: "Acessos hosting", urgencia: "media" },
    ]);
    const cliente = addCliente(db, { nome: "Test Corp", whatsapp: "111" });
    const count = applyTemplate(db, "site", cliente.id);
    expect(count).toBe(2);
    const fus = listFollowups(db, {});
    expect(fus).toHaveLength(2);
  });

  it("applies template with urgencia override", () => {
    createTemplate("site", "Website", [
      { tipo: "briefing", descricao: "Briefing", urgencia: "baixa" },
    ]);
    const cliente = addCliente(db, { nome: "Test Corp", whatsapp: "111" });
    applyTemplate(db, "site", cliente.id, "alta");
    const fus = listFollowups(db, {});
    expect(fus[0].urgencia).toBe("alta");
  });
});
