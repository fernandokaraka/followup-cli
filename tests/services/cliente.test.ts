import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers.js";
import { addCliente, listClientes, findCliente, editCliente, removeCliente } from "../../src/services/cliente.js";
import { addFollowup } from "../../src/services/followup.js";
import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

describe("cliente service", () => {
  let db: BaseSQLiteDatabase<"sync", void>;

  beforeEach(async () => {
    db = await createTestDb();
  });

  describe("addCliente", () => {
    it("creates a client and returns it with an id", () => {
      const cliente = addCliente(db, {
        nome: "Empresa X",
        whatsapp: "11999999999",
      });
      expect(cliente.id).toBe(1);
      expect(cliente.nome).toBe("Empresa X");
      expect(cliente.whatsapp).toBe("11999999999");
    });

    it("creates multiple clients with sequential ids", () => {
      const c1 = addCliente(db, { nome: "Empresa A", whatsapp: "111" });
      const c2 = addCliente(db, { nome: "Empresa B", whatsapp: "222" });
      expect(c1.id).toBe(1);
      expect(c2.id).toBe(2);
    });
  });

  describe("listClientes", () => {
    it("returns empty array when no clients exist", () => {
      expect(listClientes(db)).toEqual([]);
    });

    it("returns all clients", () => {
      addCliente(db, { nome: "Empresa A", whatsapp: "111" });
      addCliente(db, { nome: "Empresa B", whatsapp: "222" });
      const result = listClientes(db);
      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe("Empresa A");
      expect(result[1].nome).toBe("Empresa B");
    });
  });

  describe("findCliente", () => {
    it("finds client by exact name", () => {
      addCliente(db, { nome: "Empresa X", whatsapp: "111" });
      const result = findCliente(db, "Empresa X");
      expect(result).not.toBeNull();
      expect(result!.nome).toBe("Empresa X");
    });

    it("finds client by partial name (case-insensitive)", () => {
      addCliente(db, { nome: "Empresa X", whatsapp: "111" });
      const result = findCliente(db, "emp");
      expect(result).not.toBeNull();
      expect(result!.nome).toBe("Empresa X");
    });

    it("returns null when no match", () => {
      const result = findCliente(db, "Inexistente");
      expect(result).toBeNull();
    });

    it("throws when partial name matches multiple clients", () => {
      addCliente(db, { nome: "Empresa A", whatsapp: "111" });
      addCliente(db, { nome: "Empresa B", whatsapp: "222" });
      expect(() => findCliente(db, "Empresa")).toThrow("Múltiplos clientes");
    });
  });

  describe("editCliente", () => {
    it("updates client name", () => {
      const c = addCliente(db, { nome: "Old Name", whatsapp: "111" });
      editCliente(db, c.id, { nome: "New Name" });
      const found = findCliente(db, "New Name");
      expect(found).not.toBeNull();
      expect(found!.nome).toBe("New Name");
    });

    it("throws for non-existent client", () => {
      expect(() => editCliente(db, 999, { nome: "X" })).toThrow("não encontrado");
    });
  });

  describe("removeCliente", () => {
    it("removes client with no followups", () => {
      const c = addCliente(db, { nome: "To Delete", whatsapp: "111" });
      removeCliente(db, c.id);
      expect(listClientes(db)).toHaveLength(0);
    });

    it("throws when client has linked followups", () => {
      const c = addCliente(db, { nome: "Has FU", whatsapp: "111" });
      addFollowup(db, { clienteId: c.id, tipoSlug: "briefing", descricao: "x" });
      expect(() => removeCliente(db, c.id)).toThrow("follow-ups vinculados");
    });
  });
});
