import { Command } from "commander";
import chalk from "chalk";
import { getDb, saveDb } from "../db/connection.js";
import { tiposFollowup } from "../db/schema.js";

export function registerTiposCommands(program: Command): void {
  const tipos = program
    .command("tipos")
    .description("Listar tipos de follow-up disponíveis")
    .action(async () => {
      const db = await getDb();
      const result = db.select().from(tiposFollowup).all();
      console.log(chalk.bold("\nTipos de follow-up:\n"));
      for (const t of result) {
        const badge = t.padrao ? chalk.dim(" (padrão)") : chalk.cyan(" (custom)");
        console.log(`  ${chalk.bold(t.slug)}  ${t.descricao}${badge}`);
      }
      console.log();
    });

  tipos
    .command("add <slug>")
    .description("Criar novo tipo de follow-up")
    .option("--descricao <text>", "Descrição do tipo")
    .action(async (slug: string, opts: { descricao?: string }) => {
      const db = await getDb();
      const descricao = opts.descricao ?? slug;
      db.insert(tiposFollowup)
        .values({ slug, descricao, padrao: false })
        .run();
      saveDb();
      console.log(chalk.green(`✓ Tipo "${slug}" criado.`));
    });
}
