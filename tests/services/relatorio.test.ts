import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers.js";
import { addCliente } from "../../src/services/cliente.js";
import { addFollowup, done, cobrar } from "../../src/services/followup.js";
import { generateReport, formatReportTerminal, formatReportMarkdown } from "../../src/services/relatorio.js";
import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

describe("relatorio service", () => {
  let db: BaseSQLiteDatabase<"sync", void>;
  let clienteId: number;

  beforeEach(async () => {
    db = await createTestDb();
    clienteId = addCliente(db, { nome: "Empresa X", whatsapp: "111" }).id;
  });

  it("returns zeroes for empty database", () => {
    const report = generateReport(db, 7);
    expect(report.concluidos).toBe(0);
    expect(report.pendentes).toBe(0);
    expect(report.totalCobrancas).toBe(0);
    expect(report.tempoMedioResposta).toBeNull();
  });

  it("counts pendentes", () => {
    addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
    addFollowup(db, { clienteId, tipoSlug: "acessos", descricao: "b" });
    const report = generateReport(db, 7);
    expect(report.pendentes).toBe(2);
  });

  it("counts concluidos and cobrancas", () => {
    const fu = addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
    cobrar(db, fu.id, "test");
    done(db, fu.id);
    const report = generateReport(db, 7);
    expect(report.concluidos).toBe(1);
    expect(report.totalCobrancas).toBe(1);
  });

  it("formats terminal report", () => {
    addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
    const report = generateReport(db, 7);
    const text = formatReportTerminal(report);
    expect(text).toContain("Relatório");
    expect(text).toContain("Pendentes:  1");
  });

  it("formats markdown report", () => {
    addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
    const report = generateReport(db, 7);
    const md = formatReportMarkdown(report);
    expect(md).toContain("## Follow-up Report");
    expect(md).toContain("| Pendentes | 1 |");
  });
});
