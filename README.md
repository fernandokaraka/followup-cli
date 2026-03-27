# followup-cli

CLI para controle de follow-up de demandas pendentes com clientes. Ideal para agências, estúdios e freelancers que precisam cobrar briefings, acessos, validações e outras entregas.

Dois modos de uso: **comandos diretos** para ações rápidas e **dashboard interativo** para visão geral.

## O Problema

Seu cliente deve um briefing. Você pediu há três dias. Ele respondeu? Você cobrou de novo? Quantas vezes? Nenhum gerenciador de tarefas resolve isso bem porque o problema não é gerenciar tarefas — é gerenciar a espera.

**followup-cli** rastreia o que está no campo do cliente, há quanto tempo está lá, e quantas vezes você cobrou.

## Instalação

```bash
npm install -g followup-cli
```

Zero dependências nativas — roda em qualquer máquina com Node.js.

## Resumo rápido

Rode `followup` sem argumentos para ver o status geral:

```
followup v1.1.0

  3 pendentes | 1 sem cobrança há 5 dias ⚠ | 2 cobrados

  Mais atrasados:
  #3  Empresa X     Briefing site         5 dias  | 3x cobrado
  #7  Empresa W     Acessos hospedagem    4 dias  | 0x cobrado ⚠

  followup --help para ver comandos
```

## Uso

### Clientes

```bash
followup cliente add "Empresa X" --whatsapp "11999999999"
followup cliente list
followup cliente edit 1 --nome "Novo Nome"
followup cliente rm 1
```

### Follow-ups

```bash
# Criar
followup add "Empresa X" --tipo briefing --descricao "site institucional" --urgencia alta

# Listar
followup list
followup list --cliente "Empresa X"
followup list --urgencia alta
followup list --atrasados 7          # pendentes há mais de 7 dias

# Cobrar (mostra link do WhatsApp automaticamente)
followup cobrar 1 --nota "mandei whatsapp, disse que envia amanhã"
# → https://wa.me/5511999999999

# Ver histórico de cobranças
followup historico 1

# Marcar como concluído
followup done 1 --nota "cliente entregou o briefing"

# Editar / Remover
followup edit 1 --urgencia alta
followup rm 1

# Ver tudo (incluindo concluídos)
followup list --todos
```

### Templates

Crie templates reutilizáveis para tipos de projeto recorrentes:

```bash
# Criar template com itens
followup template create "site" --items briefing,acessos,hospedagem,validacao

# Criar template interativamente
followup template create "site" -i

# Listar e ver detalhes
followup template list
followup template show "site"

# Aplicar template a um cliente (cria todos os follow-ups de uma vez)
followup template apply "site" "Empresa X"
followup template apply "site" "Empresa X" --urgencia alta

# Remover
followup template rm "site"
```

Templates ficam em `~/.followup/templates.json` — edite direto se preferir.

### Tipos de follow-up

Tipos padrão: `briefing`, `acessos`, `hospedagem`, `validacao`, `conteudo`

```bash
followup tipos
followup tipos add "contrato" --descricao "Contrato assinado"
```

### Dashboard

```bash
followup dashboard
```

Dashboard interativo no terminal:

- Itens agrupados por urgência (alta/média/baixa)
- Navegação por setas
- Atalhos: **A**dd, **C**obrar, **D**one, **H**istórico, **F**iltro, **Q**uit
- Destaque para itens esquecidos (sem cobrança há mais de 2 dias)
- Link do WhatsApp ao cobrar

### Relatório

```bash
# Terminal colorido (últimos 7 dias)
followup relatorio

# Período customizado
followup relatorio --dias 30

# Markdown (para colar no Slack, Notion, etc.)
followup relatorio --md
```

## Como funciona

- Dados ficam em `~/.followup/data.db` (SQLite local via WASM)
- Templates ficam em `~/.followup/templates.json`
- Zero config — na primeira execução cria tudo automaticamente
- Cada follow-up rastreia: cliente, tipo, descrição, urgência, status e histórico completo de cobranças

## Contribuindo

Contribuições são bem-vindas! Abra issues e pull requests.

## Stack

TypeScript, Commander.js, Ink, Drizzle ORM, sql.js

## Licença

MIT
