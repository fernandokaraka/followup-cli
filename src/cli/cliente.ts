import { Command } from "commander";
import chalk from "chalk";
import { getDb, saveDb } from "../db/connection.js";
import { addCliente, listClientes, editCliente, removeCliente } from "../services/cliente.js";

export function registerClienteCommands(program: Command): void {
  const cliente = program
    .command("cliente")
    .description("Gerenciar clientes");

  cliente
    .command("add <nome>")
    .description("Adicionar novo cliente")
    .option("--whatsapp <numero>", "Número WhatsApp", "")
    .action(async (nome: string, opts: { whatsapp: string }) => {
      const db = await getDb();
      const c = addCliente(db, { nome, whatsapp: opts.whatsapp });
      saveDb();
      console.log(chalk.green(`✓ Cliente #${c.id} criado: ${c.nome}`));
    });

  cliente
    .command("list")
    .description("Listar todos os clientes")
    .action(async () => {
      const db = await getDb();
      const result = listClientes(db);
      if (result.length === 0) {
        console.log(chalk.yellow("Nenhum cliente cadastrado."));
        return;
      }
      console.log(chalk.bold("\nClientes:\n"));
      for (const c of result) {
        console.log(`  #${c.id}  ${c.nome}  ${chalk.dim(c.whatsapp)}`);
      }
      console.log();
    });

  cliente
    .command("edit <id>")
    .description("Editar um cliente")
    .option("--nome <nome>", "Novo nome")
    .option("--whatsapp <numero>", "Novo WhatsApp")
    .action(async (id: string, opts: { nome?: string; whatsapp?: string }) => {
      const db = await getDb();
      editCliente(db, parseInt(id, 10), opts);
      saveDb();
      console.log(chalk.green(`✓ Cliente #${id} atualizado.`));
    });

  cliente
    .command("rm <id>")
    .description("Remover um cliente")
    .action(async (id: string) => {
      const db = await getDb();
      removeCliente(db, parseInt(id, 10));
      saveDb();
      console.log(chalk.green(`✓ Cliente #${id} removido.`));
    });
}
