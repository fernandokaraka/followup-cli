import React, { useState } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { getDb, saveDb } from "../db/connection.js";
import { listFollowups, cobrar, done, historico as getHistorico } from "../services/followup.js";
import { getClienteWhatsappLink } from "../services/whatsapp.js";
import { FollowupList } from "./FollowupList.js";
import { FilterBar } from "./FilterBar.js";
import { AddForm } from "./AddForm.js";
import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

type Mode = "list" | "cobrar" | "historico" | "add";

let _cachedDb: BaseSQLiteDatabase<"sync", void> | null = null;

function Dashboard() {
  const { exit } = useApp();
  const db = _cachedDb!;

  const [mode, setMode] = useState<Mode>("list");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [urgenciaFilter, setUrgenciaFilter] = useState<string | null>(null);
  const [cobrarNota, setCobrarNota] = useState("");
  const [historicoEntries, setHistoricoEntries] = useState<
    { data: string; nota: string | null }[]
  >([]);
  const [waLink, setWaLink] = useState<string | null>(null);

  const items = listFollowups(db, {
    urgencia: (urgenciaFilter as "alta" | "media" | "baixa") ?? undefined,
  });

  const selectedItem = items[selectedIndex] ?? null;

  useInput((input, key) => {
    if (mode === "historico") {
      // Any key returns to list
      setMode("list");
      return;
    }

    if (mode === "cobrar" || mode === "add") {
      // TextInput handles input in cobrar/add mode
      return;
    }

    // List mode
    if (input === "q" || input === "Q") {
      exit();
      return;
    }

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
    if (key.downArrow && selectedIndex < items.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }

    if ((input === "a" || input === "A")) {
      setMode("add");
    }

    if ((input === "c" || input === "C") && selectedItem) {
      setMode("cobrar");
      setCobrarNota("");
      setWaLink(null);
    }

    if ((input === "d" || input === "D") && selectedItem) {
      done(db, selectedItem.id);
      saveDb();
      if (selectedIndex >= items.length - 1 && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
    }

    if ((input === "h" || input === "H") && selectedItem) {
      const entries = getHistorico(db, selectedItem.id);
      setHistoricoEntries(entries);
      setMode("historico");
    }

    if (input === "f" || input === "F") {
      if (urgenciaFilter === null) setUrgenciaFilter("alta");
      else if (urgenciaFilter === "alta") setUrgenciaFilter("media");
      else if (urgenciaFilter === "media") setUrgenciaFilter("baixa");
      else setUrgenciaFilter(null);
      setSelectedIndex(0);
    }
  });

  // Add mode
  if (mode === "add") {
    return <AddForm db={db} onDone={() => setMode("list")} onCancel={() => setMode("list")} />;
  }

  // Cobrar mode
  if (mode === "cobrar" && selectedItem) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Cobrar follow-up #{selectedItem.id}: {selectedItem.descricao}</Text>
        <Box>
          <Text>Nota: </Text>
          <TextInput
            value={cobrarNota}
            onChange={setCobrarNota}
            onSubmit={(value) => {
              cobrar(db, selectedItem.id, value || undefined);
              saveDb();
              const link = getClienteWhatsappLink(db, selectedItem.clienteId);
              setWaLink(link);
              setMode("list");
            }}
          />
        </Box>
        {waLink && <Text color="cyan">→ {waLink}</Text>}
        <Text dimColor>(Enter para confirmar, nota é opcional)</Text>
      </Box>
    );
  }

  // Historico mode
  if (mode === "historico" && selectedItem) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Histórico do follow-up #{selectedItem.id}: {selectedItem.descricao}</Text>
        <Box flexDirection="column" marginTop={1}>
          {historicoEntries.length === 0 ? (
            <Text dimColor>Nenhuma cobrança registrada.</Text>
          ) : (
            historicoEntries.map((entry, i) => (
              <Text key={i}>
                {new Date(entry.data + "Z").toLocaleDateString("pt-BR")}
                {entry.nota ? ` — ${entry.nota}` : ""}
              </Text>
            ))
          )}
        </Box>
        <Text dimColor>(Qualquer tecla para voltar)</Text>
      </Box>
    );
  }

  // List mode (default)
  const today = new Date().toLocaleDateString("pt-BR");

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">
          ODUO Follow-up Dashboard
        </Text>
        <Text dimColor>{today}</Text>
      </Box>

      <Text bold>PENDENTES ({items.length})</Text>

      <FilterBar urgencia={urgenciaFilter} cliente={null} />

      <FollowupList items={items} selectedIndex={selectedIndex} />

      <Box marginTop={1}>
        <Text dimColor>
          [A]dd  [C]obrar  [D]one  [H]istórico  [F]iltro  [Q]uit
        </Text>
      </Box>
    </Box>
  );
}

export async function renderDashboard(): Promise<void> {
  _cachedDb = await getDb();
  render(<Dashboard />);
}
