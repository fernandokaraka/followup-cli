import { Command } from "commander";
import chalk from "chalk";
import { getDb } from "../db/connection.js";
import { generateReport, formatReportTerminal, formatReportMarkdown } from "../services/relatorio.js";

export function registerRelatorioCommands(program: Command): void {
  program
    .command("relatorio")
    .description("Gerar relatório de follow-ups")
    .option("--dias <numero>", "Período em dias", "7")
    .option("--md", "Output em Markdown")
    .action(async (opts: { dias: string; md?: boolean }) => {
      const db = await getDb();
      const dias = parseInt(opts.dias, 10);
      const report = generateReport(db, dias);

      if (opts.md) {
        console.log(formatReportMarkdown(report));
      } else {
        console.log(chalk.bold(`\n${formatReportTerminal(report)}\n`));
      }
    });
}
