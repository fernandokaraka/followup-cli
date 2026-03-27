import { Command } from "commander";
import chalk from "chalk";
import { registerClienteCommands } from "./cliente.js";
import { registerFollowupCommands } from "./followup-cmd.js";
import { registerTiposCommands } from "./tipos.js";
import { registerTemplateCommands } from "./template.js";
import { registerRelatorioCommands } from "./relatorio.js";

const program = new Command();

program
  .name("followup")
  .description("Controle de follow-up de demandas para clientes")
  .version("1.1.0");

registerClienteCommands(program);
registerFollowupCommands(program);
registerTiposCommands(program);
registerTemplateCommands(program);
registerRelatorioCommands(program);

// Default action: show summary when no subcommand
program.action(async () => {
  const { getDb } = await import("../db/connection.js");
  const { listFollowups } = await import("../services/followup.js");

  const db = await getDb();
  const items = listFollowups(db, {});

  console.log(chalk.bold.cyan(`\nfollowup v1.1.0\n`));

  if (items.length === 0) {
    console.log(chalk.green("  Tudo em dia! Nenhum follow-up pendente.\n"));
    console.log(chalk.dim("  followup --help para ver comandos\n"));
    return;
  }

  const semCobranca = items.filter((i) => {
    const days = Math.floor((Date.now() - new Date(i.criadoEm + "Z").getTime()) / 86400000);
    return days > 2 && i.totalCobrancas === 0;
  });

  const cobradosHoje = items.filter((i) => {
    if (i.totalCobrancas === 0) return false;
    return i.status === "cobrado";
  });

  console.log(
    `  ${items.length} pendentes` +
    (semCobranca.length > 0 ? chalk.red(` | ${semCobranca.length} sem cobrança ⚠`) : "") +
    (cobradosHoje.length > 0 ? chalk.green(` | ${cobradosHoje.length} cobrados`) : "")
  );
  console.log();

  // Top 5 mais atrasados
  const sorted = [...items].sort((a, b) => {
    const dA = new Date(a.criadoEm + "Z").getTime();
    const dB = new Date(b.criadoEm + "Z").getTime();
    return dA - dB; // oldest first
  }).slice(0, 5);

  if (sorted.length > 0) {
    console.log(chalk.bold("  Mais atrasados:"));
    for (const item of sorted) {
      const days = Math.floor((Date.now() - new Date(item.criadoEm + "Z").getTime()) / 86400000);
      const daysStr = days === 0 ? "hoje" : days === 1 ? "1 dia" : `${days} dias`;
      const warn = days > 2 && item.totalCobrancas === 0 ? chalk.red(" ⚠") : "";
      console.log(
        `  #${item.id}  ${item.clienteNome.padEnd(16)} ${(item.tipoSlug + ": " + item.descricao).slice(0, 25).padEnd(26)} ${daysStr.padEnd(8)} | ${item.totalCobrancas}x cobrado${warn}`
      );
    }
    console.log();
  }

  console.log(chalk.dim("  followup --help para ver comandos\n"));
});

program.parse();
