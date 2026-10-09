# Frontend — Financy

Stack: **React 19 + TypeScript + Vite + TailwindCSS + Apollo Client (GraphQL) + Zustand +
React Hook Form + Yup + Radix UI**.

Fluxo típico de uma tela:

```
Page (pages/X/index.tsx)
  ├─ orquestra estado local (useState/useForm)
  ├─ chama Services (pages/X/services) ou utils/fetchData para buscar/mutar dados
  │     └─ Service chama o Apollo Client com a query/mutation de lib/graphql
  └─ delega renderização para Componentes (próprios da página ou compartilhados em components/)
```

Estado global (ex.: sessão do usuário) fica em `src/stores` (Zustand). Estado de tela fica local
na própria página.

## Estrutura de pastas

| Pasta | Responsabilidade |
|---|---|
| `src/pages/<Feature>` | Uma pasta por tela. Contém `index.tsx` e subpastas `components/`, `models/`, `services/`, `utils/` **específicas daquela feature**. |
| `src/components` | Componentes reutilizáveis entre features (`CustomInput`, `CustomSelect`, `PaginationTable`, `DatePicker`, `Layout`, `Header`). |
| `src/components/ui` | Primitivos de design system (Radix + `class-variance-authority`). Sem regra de negócio. |
| `src/lib/graphql` | Cliente Apollo (`apollo.ts`) e `queries`/`mutation` GraphQL (uma por arquivo). |
| `src/stores` | Estado global com Zustand (ex.: `stores/auth`). |
| `src/shared/models` | Tipos compartilhados entre features (`TransactionModel`, `CategoryModel`). |
| `src/types` | Tipos globais do domínio. |
| `src/utils` | Funções puras reutilizáveis (`formatCurrency`, `stringToNumber`, `colorMap`, `getLucideIcon`). |

Regra prática: específico de uma tela → dentro de `pages/<Feature>`. Usado (ou plausivelmente
será usado) por mais de uma tela → sobe para `components/`, `shared/` ou `utils/`.

## Padrões de projeto

- **Co-location por feature**: cada componente/página tem `index.tsx` + `models/index.ts` próprio.
- **Camada de serviço no frontend**: páginas não chamam `apolloClient` diretamente; chamam um
  `service` local (`pages/<Feature>/services/index.ts`) que encapsula a query/mutation.
- **Store global (Zustand + persist)**: `stores/auth` expõe ações assíncronas já encapsulando a
  chamada Apollo. Estado de uma tela isolada não deve ir para um store global.
- **Apollo Link chain** (`errorLink → authLink → httpLink`): refresh de token transparente via
  `Observable` em `apollo.ts` — não duplique esse tratamento em componentes.
- **UI com Radix + CVA + `cn()`** (`lib/utils.ts`): não concatenar `className` manualmente.
- **Componentes `Custom*`** (`CustomInput`, `CustomSelect`, `CustomCheckbox`, `DatePicker`)
  padronizam label, erro e acessibilidade. Todo campo de formulário novo deve usá-los, nunca o
  primitivo Radix/`ui/input` direto.

## Boas práticas obrigatórias

### Reutilização de código
- Antes de formatar valor, converter string↔number, mapear cor/ícone, procure em `src/utils`.
- Antes de criar input/select/checkbox do zero, use os componentes de `src/components`.
- Cuidado com lógica duplicada entre front e back (ex.: `formatCurrency.ts` normaliza moeda em
  pt-BR de forma quase idêntica ao `totalAmount` do backend) — se mexer em uma, confira a outra.

### Refatoração quando necessário
- `fetchTransactionData` busca **todas** as transações (`fetchPolicy: "no-cache"`, sem paginação
  no servidor) e filtra tudo no cliente. Não escala. Ao tocar nesse arquivo, migre os filtros
  (`description`, `type`, `categoryId`, `period`) para argumentos da query GraphQL.
- Há sobreposição de papel entre `pages/X/services` (mutations) e `pages/X/utils/fetchData`
  (queries). Ao criar uma feature nova, considere unificar leitura e escrita numa única camada
  (serviço ou hook customizado) em vez de espalhar em duas pastas.

### Código do escoteiro (sempre que mexer em algo, deixe melhor)
- Troque concatenação manual de `className` por `cn()` quando notar o padrão antigo (ex.:
  `mergedClassName` montado via array + `.join(" ")` em `CustomInput`).
- Não deixe `console.error` sem tratamento real — ao menos propague/sinalize ao usuário via
  `toast`, não só logue no console.
- Troque `any` remanescente por tipo explícito quando o arquivo já estiver aberto.
- Remova código comentado morto ao editar o arquivo que o contém.
- Mantenha o idioma das mensagens de UI consistente (hoje majoritariamente pt-BR).

### Outras boas práticas
- **Formulários**: use `react-hook-form` + `yup` (via `@hookform/resolvers`) para qualquer
  formulário com mais de 1-2 campos ou validação não trivial. Erros são exibidos via prop `error`
  dos componentes `Custom*` — não crie uma nova convenção de exibição de erro.
- **Tipos compartilhados**: tipo usado por mais de uma feature vai para `src/shared/models`; tipo
  específico fica no `models/index.ts` local. Não duplique um tipo já existente em `shared/models`.
- Use `import type { ... }` para tipos (`verbatimModuleSyntax: true` no `tsconfig.app.json` já
  força isso no build).
- **Estilização**: Tailwind é a única forma de estilização — sem CSS-in-JS ou módulos CSS soltos.
- Use o alias `@/` para imports absolutos a partir de `src/` — evite `../../../..`.

## Scripts

```bash
npm install
npm run dev       # servidor de desenvolvimento (Vite)
npm run build     # type-check (tsc -b) + build de produção
npm run lint      # ESLint
npm run preview   # preview do build de produção
```

Variáveis de ambiente em `src/env.ts` (ex.: `VITE_BACKEND_URL`).

## Fluxo obrigatório de uma tarefa

Toda tarefa (feature, fix, refactor) passa por duas etapas obrigatórias: **1) planejar e obter
aprovação antes de implementar** e **2) registrar a decisão depois de implementar**. Essa regra é
a mesma nos dois lados do projeto (ver também `backend/CLAUDE.md`).

### 1. Planejamento e aprovação (antes de implementar)

Antes de escrever qualquer código, criar um plano descrevendo a tarefa. Como o projeto é
full-stack, uma mesma tarefa normalmente gera **um plano para o frontend e um para o backend**
(exceto quando a tarefa comprovadamente afeta só um dos lados — nesse caso, crie apenas o plano
correspondente).

- Os planos ficam em **`docs/plans`** na raiz do projeto (`../docs/plans`, compartilhada entre
  frontend e backend), nunca dentro de `frontend/docs` ou `backend/docs`.
- Numeração incremental **compartilhada** entre os dois lados — antes de criar um plano, verifique
  o maior número já usado em `docs/plans` (de qualquer um dos dois lados) e use o próximo.
- Nome do arquivo: `NN-FRONTEND-slug-da-tarefa.md` / `NN-BACKEND-slug-da-tarefa.md`. Exemplo, para
  a mesma tarefa: `01-FRONTEND-tela-relatorios.md` e `01-BACKEND-endpoint-relatorios.md`.
- **O plano deve ser revisado e aprovado pelo desenvolvedor que solicitou a tarefa antes de
  qualquer implementação começar.** Não iniciar a implementação com um plano em status
  "Aguardando aprovação".
- Quando a tarefa tiver plano de frontend e de backend, ou quando o plano retomar/depender de um
  plano ou doc anterior, usar links markdown relativos entre eles para facilitar a retomada
  futura (ex.: ligar o plano de frontend ao de backend da mesma tarefa).

Template do plano (`docs/plans/NN-LADO-slug.md`):

```markdown
# NN - FRONTEND|BACKEND - <Título da tarefa>

**Status:** Aguardando aprovação
**Data:** AAAA-MM-DD
**Plano irmão:** [NN-BACKEND-slug](./NN-BACKEND-slug.md) <!-- se houver o outro lado -->

## Objetivo
O que a tarefa precisa resolver/entregar.

## Abordagem proposta
Como será implementado e quais padrões deste CLAUDE.md serão seguidos.

## Arquivos/áreas afetadas
Lista dos arquivos/pastas que devem ser criados ou alterados.

## Riscos e alternativas consideradas
Outras abordagens avaliadas e por que foram descartadas.
```

Atualizar o campo `Status` conforme o plano avança: `Aguardando aprovação` → `Aprovado` →
`Concluído` (e, nesse último caso, linkar o doc de registro da etapa 2).

### 2. Registro de decisões (depois de implementar)

Ao concluir a tarefa, criar um arquivo markdown em [`docs/`](docs/) (aqui no frontend) descrevendo
a tarefa, e referenciar (link relativo) o plano aprovado em `docs/plans` que a originou. Nome do
arquivo: `docs/AAAA-MM-DD-slug-da-tarefa.md`.

Template:

```markdown
# <Título da tarefa>

**Data:** AAAA-MM-DD
**Plano:** [NN-FRONTEND-slug](../docs/plans/NN-FRONTEND-slug.md)

## O que foi feito
Descrição objetiva do que foi criado/alterado (componentes, páginas, hooks, queries, etc.).

## Por que foi feito
O problema, necessidade ou pedido que motivou a tarefa.

## Por que esse caminho foi escolhido
A abordagem/padrão escolhido, alternativas consideradas e o motivo da escolha (trade-offs,
aderência aos padrões deste CLAUDE.md, limitações aceitas, etc.).
```

Não é necessário plano nem doc para mudanças triviais (typo, ajuste de lint). Ambos são
obrigatórios para qualquer tarefa que adicione/altere comportamento, componente, tela ou padrão
de código.
