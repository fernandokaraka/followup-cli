import React from "react";
import { Box, Text } from "ink";

interface FilterBarProps {
  urgencia: string | null;
  cliente: string | null;
}

export function FilterBar({ urgencia, cliente }: FilterBarProps) {
  const filters: string[] = [];
  if (urgencia) filters.push(`Urgência: ${urgencia}`);
  if (cliente) filters.push(`Cliente: ${cliente}`);

  if (filters.length === 0) return null;

  return (
    <Box marginBottom={1}>
      <Text dimColor>Filtros: {filters.join(" | ")}</Text>
      <Text dimColor> (F para limpar)</Text>
    </Box>
  );
}
