import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { followups, cobrancas, clientes } from "../db/schema.js";
import { eq, and, gte, ne } from "drizzle-orm";

export interface ReportData {
  periodo: { inicio: string; fim: string };
  concluidos: number;
  pendentes: number;
  tempoMedioResposta: number | null; // days, null if no data
  totalCobrancas: number;
  clienteMaisLento: { nome: string; dias: number } | null;
  clienteMaisRapido: { nome: string; dias: number } | null;
}

export function generateReport(
  db: BaseSQLiteDatabase<"sync", void>,
  dias: number = 7
): ReportData {
  const now = new Date();
  const inicio = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000);
  const inicioStr = inicio.toISOString();

  // Concluidos no periodo
  const concluidos = db
    .select()
    .from(followups)
    .where(
      and(
        eq(followups.status, "concluido"),
        gte(followups.concluidoEm, inicioStr)
      )
    )
    .all();

  // Pendentes atuais (total)
  const pendentes = db
    .select()
    .from(followups)
    .where(ne(followups.status, "concluido"))
    .all();

  // Cobrancas no periodo
  const cobsNoPeriodo = db
    .select()
    .from(cobrancas)
    .where(gte(cobrancas.data, inicioStr))
    .all();

  // Tempo medio de resposta (concluidos no periodo)
  let tempoMedioResposta: number | null = null;
  if (concluidos.length > 0) {
    const tempos = concluidos.map((fu) => {
      const criado = new Date(fu.criadoEm + "Z").getTime();
      const concluido = new Date(fu.concluidoEm! + "Z").getTime();
      return Math.floor((concluido - criado) / (1000 * 60 * 60 * 24));
    });
    tempoMedioResposta = Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length);
  }

  // Cliente mais lento (maior dias pendente)
  let clienteMaisLento: { nome: string; dias: number } | null = null;
  if (pendentes.length > 0) {
    let maxDias = 0;
    let maxClienteId = 0;
    for (const fu of pendentes) {
      const dias = Math.floor((now.getTime() - new Date(fu.criadoEm + "Z").getTime()) / (1000 * 60 * 60 * 24));
      if (dias > maxDias) {
        maxDias = dias;
        maxClienteId = fu.clienteId;
      }
    }
    if (maxClienteId > 0) {
      const c = db.select().from(clientes).where(eq(clientes.id, maxClienteId)).get();
      if (c) clienteMaisLento = { nome: c.nome, dias: maxDias };
    }
  }

  // Cliente mais rapido (menor tempo medio entre concluidos)
  let clienteMaisRapido: { nome: string; dias: number } | null = null;
  if (concluidos.length > 0) {
    const byCliente: Record<number, number[]> = {};
    for (const fu of concluidos) {
      const tempo = Math.floor(
        (new Date(fu.concluidoEm! + "Z").getTime() - new Date(fu.criadoEm + "Z").getTime()) / (1000 * 60 * 60 * 24)
      );
      if (!byCliente[fu.clienteId]) byCliente[fu.clienteId] = [];
      byCliente[fu.clienteId].push(tempo);
    }
    let minAvg = Infinity;
    let minClienteId = 0;
    for (const [cid, tempos] of Object.entries(byCliente)) {
      const avg = tempos.reduce((a, b) => a + b, 0) / tempos.length;
      if (avg < minAvg) {
        minAvg = avg;
        minClienteId = parseInt(cid);
      }
    }
    if (minClienteId > 0) {
      const c = db.select().from(clientes).where(eq(clientes.id, minClienteId)).get();
      if (c) clienteMaisRapido = { nome: c.nome, dias: Math.round(minAvg) };
    }
  }

  return {
    periodo: {
      inicio: inicio.toLocaleDateString("pt-BR"),
      fim: now.toLocaleDateString("pt-BR"),
    },
    concluidos: concluidos.length,
    pendentes: pendentes.length,
    tempoMedioResposta,
    totalCobrancas: cobsNoPeriodo.length,
    clienteMaisLento,
    clienteMaisRapido,
  };
}

export function formatReportTerminal(report: ReportData): string {
  const lines: string[] = [];
  lines.push(`Relatório — ${report.periodo.inicio} a ${report.periodo.fim}`);
  lines.push("");
  lines.push(`  Concluídos: ${report.concluidos}`);
  lines.push(`  Pendentes:  ${report.pendentes}`);
  lines.push(`  Tempo médio de resposta: ${report.tempoMedioResposta !== null ? report.tempoMedioResposta + " dias" : "N/A"}`);
  lines.push(`  Cobranças realizadas: ${report.totalCobrancas}`);
  lines.push("");
  if (report.clienteMaisLento) {
    lines.push(`  Cliente mais lento: ${report.clienteMaisLento.nome} (${report.clienteMaisLento.dias} dias sem retorno)`);
  }
  if (report.clienteMaisRapido) {
    lines.push(`  Cliente mais rápido: ${report.clienteMaisRapido.nome} (${report.clienteMaisRapido.dias} dias)`);
  }
  return lines.join("\n");
}

export function formatReportMarkdown(report: ReportData): string {
  const lines: string[] = [];
  lines.push(`## Follow-up Report — ${report.periodo.inicio} a ${report.periodo.fim}`);
  lines.push("");
  lines.push("| Métrica | Valor |");
  lines.push("|---------|-------|");
  lines.push(`| Concluídos | ${report.concluidos} |`);
  lines.push(`| Pendentes | ${report.pendentes} |`);
  lines.push(`| Tempo médio de resposta | ${report.tempoMedioResposta !== null ? report.tempoMedioResposta + " dias" : "N/A"} |`);
  lines.push(`| Cobranças realizadas | ${report.totalCobrancas} |`);
  lines.push("");
  lines.push("### Clientes");
  if (report.clienteMaisLento) {
    lines.push(`- **Mais lento:** ${report.clienteMaisLento.nome} (${report.clienteMaisLento.dias} dias)`);
  }
  if (report.clienteMaisRapido) {
    lines.push(`- **Mais rápido:** ${report.clienteMaisRapido.nome} (${report.clienteMaisRapido.dias} dias)`);
  }
  return lines.join("\n");
}
