import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { findCliente } from "../services/cliente.js";
import { addFollowup } from "../services/followup.js";
import { saveDb } from "../db/connection.js";

interface AddFormProps {
  db: BaseSQLiteDatabase<"sync", void>;
  onDone: () => void;
  onCancel: () => void;
}

type Step = "cliente" | "tipo" | "descricao" | "urgencia";

export function AddForm({ db, onDone, onCancel }: AddFormProps) {
  const [step, setStep] = useState<Step>("cliente");
  const [value, setValue] = useState("");
  const [clienteId, setClienteId] = useState<number>(0);
  const [clienteNome, setClienteNome] = useState("");
  const [tipo, setTipo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (val: string) => {
    setError("");

    if (step === "cliente") {
      try {
        const c = findCliente(db, val);
        if (!c) { setError(`Cliente "${val}" não encontrado.`); return; }
        setClienteId(c.id);
        setClienteNome(c.nome);
        setStep("tipo");
      } catch (e: any) {
        setError(e.message);
        return;
      }
    } else if (step === "tipo") {
      setTipo(val);
      setStep("descricao");
    } else if (step === "descricao") {
      setDescricao(val);
      setStep("urgencia");
    } else if (step === "urgencia") {
      const urg = val || "media";
      if (!["alta", "media", "baixa"].includes(urg)) {
        setError("Use: alta, media ou baixa");
        return;
      }
      addFollowup(db, {
        clienteId,
        tipoSlug: tipo,
        descricao,
        urgencia: urg as "alta" | "media" | "baixa",
      });
      saveDb();
      onDone();
    }
    setValue("");
  };

  const labels: Record<Step, string> = {
    cliente: "Cliente",
    tipo: "Tipo",
    descricao: "Descrição",
    urgencia: "Urgência (alta/media/baixa)",
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Adicionar Follow-up</Text>
      {clienteNome && <Text dimColor>Cliente: {clienteNome}</Text>}
      {tipo && <Text dimColor>Tipo: {tipo}</Text>}
      {descricao && <Text dimColor>Descrição: {descricao}</Text>}
      {error && <Text color="red">{error}</Text>}
      <Box>
        <Text>{labels[step]}: </Text>
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
      </Box>
      <Text dimColor>(Escape para cancelar)</Text>
    </Box>
  );
}
