import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers.js";
import { addCliente } from "../../src/services/cliente.js";
import {
  addFollowup,
  listFollowups,
  cobrar,
  done,
  historico,
  getFollowup,
  editFollowup,
  removeFollowup,
} from "../../src/services/followup.js";
import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

describe("followup service", () => {
  let db: BaseSQLiteDatabase<"sync", void>;
  let clienteId: number;

  beforeEach(async () => {
    db = await createTestDb();
    const cliente = addCliente(db, { nome: "Empresa X", whatsapp: "11999" });
    clienteId = cliente.id;
  });

  describe("addFollowup", () => {
    it("creates a followup with pendente status", () => {
      const fu = addFollowup(db, {
        clienteId,
        tipoSlug: "briefing",
        descricao: "site institucional",
        urgencia: "alta",
      });
      expect(fu.id).toBe(1);
      expect(fu.status).toBe("pendente");
      expect(fu.urgencia).toBe("alta");
    });

    it("defaults urgencia to media", () => {
      const fu = addFollowup(db, {
        clienteId,
        tipoSlug: "acessos",
        descricao: "login do hosting",
      });
      expect(fu.urgencia).toBe("media");
    });
  });

  describe("listFollowups", () => {
    it("returns only non-concluido followups by default", () => {
      addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
      const fu2 = addFollowup(db, { clienteId, tipoSlug: "acessos", descricao: "b" });
      done(db, fu2.id);

      const list = listFollowups(db, {});
      expect(list).toHaveLength(1);
      expect(list[0].tipoSlug).toBe("briefing");
    });

    it("filters by clienteId", () => {
      const c2 = addCliente(db, { nome: "Empresa Y", whatsapp: "222" });
      addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
      addFollowup(db, { clienteId: c2.id, tipoSlug: "acessos", descricao: "b" });

      const list = listFollowups(db, { clienteId });
      expect(list).toHaveLength(1);
      expect(list[0].clienteNome).toBe("Empresa X");
    });

    it("filters by urgencia", () => {
      addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a", urgencia: "alta" });
      addFollowup(db, { clienteId, tipoSlug: "acessos", descricao: "b", urgencia: "baixa" });

      const list = listFollowups(db, { urgencia: "alta" });
      expect(list).toHaveLength(1);
      expect(list[0].urgencia).toBe("alta");
    });
  });

  describe("cobrar", () => {
    it("registers a cobranca and updates status to cobrado", () => {
      const fu = addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
      cobrar(db, fu.id, "mandei whats");

      const updated = getFollowup(db, fu.id);
      expect(updated!.status).toBe("cobrado");

      const hist = historico(db, fu.id);
      expect(hist).toHaveLength(1);
      expect(hist[0].nota).toBe("mandei whats");
    });

    it("allows multiple cobrancas", () => {
      const fu = addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
      cobrar(db, fu.id, "primeira vez");
      cobrar(db, fu.id, "segunda vez");

      const hist = historico(db, fu.id);
      expect(hist).toHaveLength(2);
    });
  });

  describe("done", () => {
    it("marks followup as concluido with timestamp", () => {
      const fu = addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
      done(db, fu.id);

      const updated = getFollowup(db, fu.id);
      expect(updated!.status).toBe("concluido");
      expect(updated!.concluidoEm).not.toBeNull();
    });

    it("stores optional nota as a cobranca entry", () => {
      const fu = addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
      done(db, fu.id, "recebeu completo");

      const hist = historico(db, fu.id);
      expect(hist).toHaveLength(1);
      expect(hist[0].nota).toBe("recebeu completo");
    });
  });

  describe("historico", () => {
    it("returns cobrancas ordered by date ascending", () => {
      const fu = addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
      cobrar(db, fu.id, "primeira");
      cobrar(db, fu.id, "segunda");
      cobrar(db, fu.id, "terceira");

      const hist = historico(db, fu.id);
      expect(hist).toHaveLength(3);
      expect(hist[0].nota).toBe("primeira");
      expect(hist[2].nota).toBe("terceira");
    });
  });

  describe("editFollowup", () => {
    it("updates urgencia", () => {
      const fu = addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a", urgencia: "baixa" });
      editFollowup(db, fu.id, { urgencia: "alta" });
      const updated = getFollowup(db, fu.id);
      expect(updated!.urgencia).toBe("alta");
    });
  });

  describe("removeFollowup", () => {
    it("removes followup and its cobrancas", () => {
      const fu = addFollowup(db, { clienteId, tipoSlug: "briefing", descricao: "a" });
      cobrar(db, fu.id, "test");
      removeFollowup(db, fu.id);
      expect(getFollowup(db, fu.id)).toBeUndefined();
      expect(historico(db, fu.id)).toHaveLength(0);
    });
  });
});
