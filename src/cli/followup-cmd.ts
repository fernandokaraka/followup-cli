import { Command } from "commander";
import chalk from "chalk";
import { getDb, saveDb } from "../db/connection.js";
import { findCliente } from "../services/cliente.js";
import {
  addFollowup,
  listFollowups,
  cobrar,
  done,
  historico,
  getFollowup,
  editFollowup,
  removeFollowup,
} from "../services/followup.js";

const URGENCIA_COLORS: Record<string, (s: string) => string> = {
  alta: chalk.red,
  media: chalk.yellow,
  baixa: chalk.green,
};

function urgenciaLabel(u: string): string {
  const colorFn = URGENCIA_COLORS[u] ?? chalk.white;
  return colorFn(u.toUpperCase());
}

function daysSince(dateStr: string): number {
  const then = new Date(dateStr + "Z").getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function daysLabel(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

export function registerFollowupCommands(program: Command): void {
  program
    .command("add <cliente>")
    .description("Adicionar novo follow-up")
    .requiredOption("--tipo <tipo>", "Tipo do follow-up (briefing, acessos, etc.)")
    .requiredOption("--descricao <text>", "Descrição do item")
    .option("--urgencia <nivel>", "alta, media ou baixa", "media")
    .action(
      async (
        clienteSearch: string,
        opts: { tipo: string; descricao: string; urgencia: string }
      ) => {
        const db = await getDb();
        const cliente = findCliente(db, clienteSearch);
        if (!cliente) {
          console.log(chalk.red(`Cliente "${clienteSearch}" não encontrado.`));
          process.exit(1);
        }

        const fu = addFollowup(db, {
          clienteId: cliente.id,
          tipoSlug: opts.tipo,
          descricao: opts.descricao,
          urgencia: opts.urgencia as "alta" | "media" | "baixa",
        });
        saveDb();

        console.log(
          chalk.green(
            `✓ Follow-up #${fu.id} criado para ${cliente.nome}: ${opts.tipo} — ${opts.descricao}`
          )
        );
      }
    );

  program
    .command("list")
    .description("Listar follow-ups pendentes")
    .option("--cliente <nome>", "Filtrar por cliente")
    .option("--urgencia <nivel>", "Filtrar por urgência")
    .option("--atrasados <dias>", "Pendentes há mais de N dias")
    .option("--todos", "Incluir concluídos")
    .action(
      async (opts: {
        cliente?: string;
        urgencia?: string;
        atrasados?: string;
        todos?: boolean;
      }) => {
        const db = await getDb();

        let clienteId: number | undefined;
        if (opts.cliente) {
          const c = findCliente(db, opts.cliente);
          if (!c) {
            console.log(chalk.red(`Cliente "${opts.cliente}" não encontrado.`));
            process.exit(1);
          }
          clienteId = c.id;
        }

        let items = listFollowups(db, {
          clienteId,
          urgencia: opts.urgencia as "alta" | "media" | "baixa" | undefined,
          includeConcluido: opts.todos,
        });

        if (opts.atrasados) {
          const minDays = parseInt(opts.atrasados, 10);
          items = items.filter((i) => daysSince(i.criadoEm) >= minDays);
        }

        if (items.length === 0) {
          console.log(chalk.yellow("Nenhum follow-up encontrado."));
          return;
        }

        console.log(chalk.bold(`\nFollow-ups (${items.length}):\n`));
        for (const item of items) {
          const days = daysSince(item.criadoEm);
          const daysStr = daysLabel(days);
          const cobStr = `${item.totalCobrancas}x cobrado`;
          const warn = days > 2 && item.totalCobrancas === 0 ? chalk.bgRed(" ! ") : "";
          console.log(
            `  #${item.id}  ${item.clienteNome.padEnd(16)} ${item.tipoSlug.padEnd(14)} ${urgenciaLabel(item.urgencia)}  ${daysStr.padEnd(8)} ${chalk.dim(cobStr)} ${warn}`
          );
        }
        console.log();
      }
    );

  program
    .command("cobrar <id>")
    .description("Registrar cobrança ao cliente")
    .option("--nota <text>", "Observação sobre a cobrança")
    .action(async (id: string, opts: { nota?: string }) => {
      const db = await getDb();
      const followupId = parseInt(id, 10);
      const fu = getFollowup(db, followupId);
      if (!fu) {
        console.log(chalk.red(`Follow-up #${id} não encontrado.`));
        process.exit(1);
      }
      cobrar(db, followupId, opts.nota);
      saveDb();
      const hist = historico(db, followupId);
      console.log(
        chalk.green(`✓ Cobrança #${hist.length} registrada para follow-up #${id}.`)
      );
      // Show WhatsApp link
      const { getClienteWhatsappLink } = await import("../services/whatsapp.js");
      const waLink = getClienteWhatsappLink(db, fu.clienteId);
      if (waLink) {
        console.log(chalk.cyan(`→ ${waLink}`));
      }
    });

  program
    .command("done <id>")
    .description("Marcar follow-up como concluído")
    .option("--nota <text>", "Observação sobre a conclusão")
    .action(async (id: string, opts: { nota?: string }) => {
      const db = await getDb();
      const followupId = parseInt(id, 10);
      const fu = getFollowup(db, followupId);
      if (!fu) {
        console.log(chalk.red(`Follow-up #${id} não encontrado.`));
        process.exit(1);
      }
      done(db, followupId, opts.nota);
      saveDb();
      console.log(chalk.green(`✓ Follow-up #${id} concluído!`));
    });

  program
    .command("historico <id>")
    .description("Ver histórico de cobranças de um follow-up")
    .action(async (id: string) => {
      const db = await getDb();
      const followupId = parseInt(id, 10);
      const fu = getFollowup(db, followupId);
      if (!fu) {
        console.log(chalk.red(`Follow-up #${id} não encontrado.`));
        process.exit(1);
      }

      const entries = historico(db, followupId);
      if (entries.length === 0) {
        console.log(chalk.yellow(`Nenhuma cobrança registrada para #${id}.`));
        return;
      }

      console.log(chalk.bold(`\nHistórico do follow-up #${id}:\n`));
      for (const entry of entries) {
        const date = new Date(entry.data).toLocaleDateString("pt-BR");
        const nota = entry.nota ? ` — ${entry.nota}` : "";
        console.log(`  ${chalk.dim(date)}${nota}`);
      }
      console.log();
    });

  program
    .command("edit <id>")
    .description("Editar um follow-up")
    .option("--descricao <text>", "Nova descrição")
    .option("--urgencia <nivel>", "Nova urgência")
    .option("--tipo <tipo>", "Novo tipo")
    .action(async (id: string, opts: { descricao?: string; urgencia?: string; tipo?: string }) => {
      const db = await getDb();
      const followupId = parseInt(id, 10);
      editFollowup(db, followupId, {
        descricao: opts.descricao,
        urgencia: opts.urgencia as "alta" | "media" | "baixa" | undefined,
        tipoSlug: opts.tipo,
      });
      saveDb();
      console.log(chalk.green(`✓ Follow-up #${id} atualizado.`));
    });

  program
    .command("rm <id>")
    .description("Remover um follow-up")
    .action(async (id: string) => {
      const db = await getDb();
      const followupId = parseInt(id, 10);
      const fu = getFollowup(db, followupId);
      if (!fu) {
        console.log(chalk.red(`Follow-up #${id} não encontrado.`));
        process.exit(1);
      }

      // Simple confirmation via readline
      const readline = await import("readline");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(`Remover follow-up #${id}? (s/n): `, (answer) => {
        rl.close();
        if (answer.toLowerCase() === "s") {
          removeFollowup(db, followupId);
          saveDb();
          console.log(chalk.green(`✓ Follow-up #${id} removido.`));
        } else {
          console.log("Cancelado.");
        }
      });
    });

  program
    .command("dashboard")
    .description("Abrir dashboard interativo")
    .action(async () => {
      const { renderDashboard } = await import("../dashboard/App.js");
      await renderDashboard();
    });
}
