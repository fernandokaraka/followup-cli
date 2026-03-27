import { Command } from "commander";
import chalk from "chalk";
import { createTemplate, listTemplates, getTemplate, removeTemplate, applyTemplate } from "../services/template.js";
import { getDb, saveDb } from "../db/connection.js";
import { findCliente } from "../services/cliente.js";
import type { TemplateItem } from "../db/templates.js";
import * as readline from "readline";

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export function registerTemplateCommands(program: Command): void {
  const template = program
    .command("template")
    .description("Gerenciar templates de follow-up");

  template
    .command("create <nome>")
    .description("Criar novo template")
    .option("--items <tipos>", "Tipos separados por vírgula (briefing,acessos,hospedagem)")
    .option("--descricao <text>", "Descrição do template")
    .option("-i, --interactive", "Modo interativo")
    .action(async (nome: string, opts: { items?: string; descricao?: string; interactive?: boolean }) => {
      const descricao = opts.descricao ?? nome;

      if (opts.interactive) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const items: TemplateItem[] = [];
        let adding = true;
        let i = 1;

        while (adding) {
          const tipo = await askQuestion(rl, `Tipo do item ${i}: `);
          const desc = await askQuestion(rl, `Descrição: `);
          const urg = await askQuestion(rl, `Urgência (alta/media/baixa): `) || "media";
          items.push({ tipo, descricao: desc, urgencia: urg as "alta" | "media" | "baixa" });
          const more = await askQuestion(rl, `Adicionar outro? (s/n): `);
          adding = more.toLowerCase() === "s";
          i++;
        }
        rl.close();
        createTemplate(nome, descricao, items);
      } else if (opts.items) {
        const tipos = opts.items.split(",").map((t) => t.trim());
        const items: TemplateItem[] = tipos.map((tipo) => ({
          tipo,
          descricao: tipo,
          urgencia: "media" as const,
        }));
        createTemplate(nome, descricao, items);
      } else {
        console.log(chalk.red("Use --items ou -i (interativo) para definir os itens."));
        return;
      }
      console.log(chalk.green(`✓ Template "${nome}" criado.`));
    });

  template
    .command("list")
    .description("Listar templates disponíveis")
    .action(() => {
      const templates = listTemplates();
      const names = Object.keys(templates);
      if (names.length === 0) {
        console.log(chalk.yellow("Nenhum template cadastrado."));
        return;
      }
      console.log(chalk.bold("\nTemplates:\n"));
      for (const name of names) {
        const t = templates[name];
        console.log(`  ${chalk.bold(name)}  ${t.descricao}  ${chalk.dim(`(${t.items.length} itens)`)}`);
      }
      console.log();
    });

  template
    .command("show <nome>")
    .description("Ver detalhes de um template")
    .action((nome: string) => {
      const t = getTemplate(nome);
      if (!t) {
        console.log(chalk.red(`Template "${nome}" não encontrado.`));
        return;
      }
      console.log(chalk.bold(`\nTemplate: ${nome}\n`));
      console.log(`  ${t.descricao}\n`);
      for (const item of t.items) {
        console.log(`  - ${item.tipo}: ${item.descricao} (${item.urgencia})`);
      }
      console.log();
    });

  template
    .command("rm <nome>")
    .description("Remover template")
    .action((nome: string) => {
      removeTemplate(nome);
      console.log(chalk.green(`✓ Template "${nome}" removido.`));
    });

  template
    .command("apply <nome> <cliente>")
    .description("Aplicar template a um cliente")
    .option("--urgencia <nivel>", "Override urgência de todos os itens")
    .action(async (nome: string, clienteSearch: string, opts: { urgencia?: string }) => {
      const db = await getDb();
      const cliente = findCliente(db, clienteSearch);
      if (!cliente) {
        console.log(chalk.red(`Cliente "${clienteSearch}" não encontrado.`));
        process.exit(1);
      }
      const count = applyTemplate(db, nome, cliente.id, opts.urgencia as "alta" | "media" | "baixa" | undefined);
      saveDb();
      console.log(chalk.green(`✓ ${count} follow-ups criados para ${cliente.nome} a partir do template "${nome}".`));
    });
}
