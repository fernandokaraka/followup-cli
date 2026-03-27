import React from "react";
import { Box, Text } from "ink";

interface FollowupItem {
  id: number;
  clienteNome: string;
  tipoSlug: string;
  descricao: string;
  urgencia: string;
  status: string;
  criadoEm: string;
  totalCobrancas: number;
}

interface FollowupListProps {
  items: FollowupItem[];
  selectedIndex: number;
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

const URGENCIA_ORDER = ["alta", "media", "baixa"];

const URGENCIA_COLOR: Record<string, string> = {
  alta: "red",
  media: "yellow",
  baixa: "green",
};

export function FollowupList({ items, selectedIndex }: FollowupListProps) {
  if (items.length === 0) {
    return (
      <Box padding={1}>
        <Text color="green">Nenhum follow-up pendente!</Text>
      </Box>
    );
  }

  const groups = URGENCIA_ORDER.map((u) => ({
    urgencia: u,
    items: items.filter((i) => i.urgencia === u),
  })).filter((g) => g.items.length > 0);

  let globalIndex = 0;

  return (
    <Box flexDirection="column">
      {groups.map((group) => (
        <Box key={group.urgencia} flexDirection="column" marginBottom={1}>
          <Text bold color={URGENCIA_COLOR[group.urgencia] ?? "white"}>
            {group.urgencia.toUpperCase()}
          </Text>
          {group.items.map((item) => {
            const idx = globalIndex++;
            const isSelected = idx === selectedIndex;
            const days = daysSince(item.criadoEm);
            const warn = days > 2 && item.totalCobrancas === 0;

            return (
              <Box key={item.id}>
                <Text
                  inverse={isSelected}
                  color={warn ? "red" : undefined}
                  bold={warn}
                >
                  {isSelected ? ">" : " "} #{String(item.id).padEnd(4)}{" "}
                  {item.clienteNome.padEnd(16)}{" "}
                  {`${item.tipoSlug}: ${item.descricao}`.slice(0, 25).padEnd(26)}{" "}
                  {daysLabel(days).padEnd(8)}{" "}
                  {`${item.totalCobrancas}x cobrado`}
                  {warn ? " !" : ""}
                </Text>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
