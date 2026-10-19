# 02 - QA-BACK - Convite por código (substitui convite por e-mail)

**Data:** 2026-10-19
**Plano:** [02-BACKEND-convite-por-codigo](../plans/02-BACKEND-convite-por-codigo.md)
**Registro de implementação:** [02-convite-por-codigo](../../backend/docs/02-convite-por-codigo.md)
**Resultado final:** ✅ **Passou — 62/62 verificações, 0 falhas** (após 1 correção de bug real
encontrado durante o QA)

## Escopo do QA

Testar o backend da feature "convite por código" de ponta a ponta contra o servidor GraphQL real
(`http://localhost:4000/graphql`) e o banco de desenvolvimento real (Postgres via Neon, mesmo
`DATABASE_URL` do projeto), cobrindo especialmente os achados críticos das rodadas de revisão do
plano (ver "Abordagem proposta" e "Riscos" do plano aprovado):

1. `joinEnvironmentByCode` nunca rebaixa quem já é membro ativo (admin/user/pending) reusando o
   código.
2. `members`/`pendingMembers` em `EnvironmentModel` não vazam PII pra quem ainda não é membro, via
   `getEnvironmentByInviteCode`.
3. `getCurrentInviteCode` devolve o código atual sem gerar um novo.
4. `pending` existe de verdade (conta pra exclusão, aparece em `listMyEnvironments`, é bloqueado de
   `Category`/`Transaction`, pode sair livremente, não pode ser promovido/ser `memberId` direto).
5. Normalização do código (`trim` + uppercase) e expiração lazy nas duas operações que recebem
   código.

Fora de escopo: frontend (plano irmão ainda não implementado) e rate limiting de tentativas
(explicitamente adiado no plano).

## Método

1. Servidor subido localmente (`npx tsx src/index.ts`, porta 4000) contra o banco real do projeto.
2. Script de QA (`backend/scripts/qa-convite-por-codigo.ts`, mantido no repositório para reuso
   futuro, mesmo padrão já usado na tarefa 01) cria 3 usuários de teste com prefixo
   `qa-<timestamp>-`, executa a sequência completa de mutations/queries reais via HTTP, com alguns
   pontos de verificação direto via Prisma (ex.: confirmar que existe exatamente 1 linha de
   `EnvironmentInviteCode` por ambiente após gerar um código duas vezes).
3. Todo dado de teste criado durante as rodadas (desta tarefa e lixo acumulado de rodadas
   anteriores da tarefa 01) foi removido ao final com `scripts/qa-cleanup-all.ts --apply`.
4. Confirmado, com uma rodada final de `qa-cleanup-all.ts` (dry-run), que não resta nenhum
   usuário/ambiente de QA no banco.

## O que foi verificado (mapeado aos riscos do plano)

| # | Cenário | Risco original (plano) | Resultado |
|---|---|---|---|
| 1 | `generateEnvironmentInviteCode` bloqueado no ambiente pessoal | Regra explícita | ✅ |
| 2 | `generateEnvironmentInviteCode` por não-admin/não-membro é rejeitado | Admin only | ✅ |
| 3 | Código gerado tem 8 caracteres e aponta pro ambiente certo | Formato do código | ✅ |
| 4 | `getCurrentInviteCode` devolve o código atual sem substituí-lo; Admin only | Achado desta rodada do plano ("lacuna descoberta") | ✅ |
| 5 | Gerar um código novo invalida o anterior (upsert, nunca duplica linha) | Regra explícita (chave primária `environmentId`) | ✅ |
| 6 | `getEnvironmentByInviteCode` é preview sem efeito colateral (não cria `EnvironmentMember`) | Regra explícita | ✅ |
| 7 | `members`/`pendingMembers` não vazam PII pra quem ainda não é membro via preview | Achado de segurança desta rodada do plano | ✅ (ver bug corrigido abaixo) |
| 8 | `joinEnvironmentByCode` entra como `pending`, nunca direto como `user` | Regra explícita (postura de segurança) | ✅ |
| 9 | `pending` aparece em `listMyEnvironments` para o próprio usuário | Regra explícita | ✅ (ver bug corrigido abaixo) |
| 10 | `pending` não aparece em `members` (lista geral, visto por outro membro ativo) | `listActiveMembers` filtra `pending` | ✅ |
| 11 | `pendingMembers` é Admin only e mostra quem está pendente | Field resolver novo | ✅ |
| 12 | `pending` é bloqueado de `createCategory`/`listCategories` | `assertEnvironmentAccess` mais estrito | ✅ |
| 13 | `pending` não pode ser promovido a admin direto | `promoteToAdmin` ganha checagem de `role` | ✅ |
| 14 | `pending` não pode ser `memberId` de uma transação | `assertMemberBelongsToEnvironment` ganha checagem | ✅ |
| 15 | `approveMember` aprova `pending` → `user`; aprovar de novo é rejeitado | Regra explícita | ✅ |
| 16 | Depois de aprovado, acesso normal (Category/Transaction/promoção) funciona | Regra explícita | ✅ |
| 17 | **Reusar o código não rebaixa quem já é `user`/`admin` ativo** (nem o admin original, nem alguém promovido depois) | Achado crítico desta rodada do plano | ✅ |
| 18 | Código expirado é rejeitado nas duas operações; `getCurrentInviteCode` trata expirado como `null` | Expiração lazy | ✅ |
| 19 | Código inexistente/inválido é rejeitado | — | ✅ |
| 20 | `deleteEnvironment` bloqueado enquanto houver `pending` pendente de decisão | Regra explícita (`pending` conta como membro real ativo) | ✅ |
| 21 | `pending` pode sair livremente (`leaveEnvironment`, checagem ampla) | Regra explícita | ✅ |
| 22 | Exclusão do ambiente funciona depois de resolver o `pending`; `EnvironmentInviteCode` cascateia | Regra explícita | ✅ |

Resultado consolidado do script (rodada final, após a correção): **62 OK / 0 FAIL**.

## Bug real encontrado e corrigido durante este QA

Na primeira execução, o passo 7 (`listMyEnvironments { members { ... } } }`, exatamente a mesma
query que o script de QA da tarefa 01 já usa) falhou assim que o usuário de teste B — `pending` no
ambiente conjunto, mas `admin` do próprio ambiente pessoal — chamou `listMyEnvironments`:

```
{
  message: 'Seu acesso a este ambiente ainda não foi aprovado por um administrador.',
  path: [ 'listMyEnvironments', 1, 'members' ],
  extensions: { code: 'FORBIDDEN' }
}
```

E a resposta inteira veio com `data: null` — não só o ambiente onde B está `pending`, mas **toda a
lista**, incluindo o ambiente pessoal dele, onde B tem acesso normal.

**Causa raiz**: o plano pedia que `members`/`pendingMembers` chamassem `assertEnvironmentAccess`/
`assertEnvironmentAdmin` (que lançam `GraphQLError`) antes de devolver qualquer coisa — correto
para fechar o vazamento de PII via `getEnvironmentByInviteCode`, mas o plano não considerou que
`EnvironmentModel` também é devolvido por `listMyEnvironments` para ambientes onde o **próprio**
usuário está `pending` (requisito explícito do plano: "aparece em `listMyEnvironments`"). Como
`members`/`pendingMembers`/a própria lista de `listMyEnvironments` eram todos campos GraphQL não-
nulos, o erro lançado ao resolver `members` de **um único** ambiente da lista propaga (regra de
null-propagation do GraphQL) até anular a lista inteira.

**Correção**: `members`/`pendingMembers` em `EnvironmentModel` (`backend/src/models/environment.model.ts`)
passaram a ser `nullable: true`. Os field resolvers correspondentes em
`backend/src/resolvers/environment.resolver.ts` passaram a devolver `null` (em vez de lançar)
quando quem pediu não tem o acesso necessário, usando dois helpers booleanos novos em
`backend/src/utils/environment-access.ts` (`hasEnvironmentAccess`/`isEnvironmentAdmin`) que nunca
lançam. `null` preserva exatamente a mesma garantia de segurança do plano (nenhuma PII é
devolvida), só não propaga erro pro resto da resposta. Depois da correção, a suíte completa passou
62/62 — incluindo o próprio cenário que expôs o bug (passo 9: `pendingMembers` visto pelo Admin
continua funcionando normalmente; passo 7: `listMyEnvironments` de quem está `pending` num
ambiente e `admin` noutro já não quebra mais).

Esse achado confirma, de novo (mesmo padrão do bug documentado no QA da tarefa 01), por que vale
testar contra o schema GraphQL real pedindo os campos resolvidos como um client de fato faria — é
exatamente o tipo de interação entre dois requisitos corretos isoladamente (seção "Novas
mutations"/"Terceira permissão" do plano) que só aparece quando os dois são exercitados juntos.

## Verificação de não-regressão

- `npx tsc --noEmit --skipLibCheck`: sem erros, antes e depois da correção.
- `npx tsx scripts/qa-ambientes-compartilhados.ts` (script da tarefa 01) re-executado: os passos
  1-5 (ambiente pessoal automático, criação de ambiente conjunto, categoria/transação, validação
  cross-environment de `memberId`) continuam passando sem alteração de comportamento. A partir do
  passo 6 o script falha **conforme esperado**, porque testa `inviteMember`/
  `acceptEnvironmentInvite`/etc., mutations que esta tarefa removeu deliberadamente (substituídas
  por este fluxo de código) — não é uma regressão, é a confirmação de que a remoção do convite por
  e-mail foi completa. O script da tarefa 01 e `qa-cleanup-all.ts` tiveram só as referências ao
  model `EnvironmentInvite` (removido) trocadas por `EnvironmentInviteCode`, para continuarem
  compilando.
- Banco de desenvolvimento confirmado limpo ao final: `qa-cleanup-all.ts` (dry-run) não encontrou
  nenhum usuário/ambiente de QA restante — a rodada de limpeza em massa também removeu lixo
  acumulado de execuções anteriores da tarefa 01 (4 ambientes pessoais órfãos + 4 usuários
  `qa.*@example.com` que já estavam no banco antes desta tarefa).

## Log de execução (rodada final, após a correção)

```
=== QA Convite por Código (run 1792420632826) ===
... (62 linhas "OK", 0 "FAIL") ...
=== RESULTADO: 62 OK / 0 FAIL ===
```

## Conclusão

O backend da tarefa 02 (convite por código) está **funcionando conforme o plano aprovado**,
incluindo o achado crítico de segurança (reuso de código não rebaixa membro ativo) e o vazamento
de PII original (preview via código não expõe `members`/`pendingMembers`). Um bug real adicional,
não previsto no plano, foi encontrado e corrigido durante este QA (erro em `members` de um
ambiente `pending` anulava toda a resposta de `listMyEnvironments`) — documentado acima e em
[02-convite-por-codigo.md](../../backend/docs/02-convite-por-codigo.md#achado-durante-qa-não-previsto-no-plano-members-pendingmembers-não-podiam-lançar-erro).
Depois da correção, nenhuma falha restante. Frontend continua pendente (plano irmão ainda não
implementado).

## Como reproduzir este teste

```bash
cd backend
npm run dev            # em um terminal — deixa o servidor rodando em :4000
```

Em outro terminal:

```bash
cd backend
npx tsx scripts/qa-convite-por-codigo.ts
```

Saída esperada: uma linha `OK`/`FAIL` por verificação, terminando em
`=== RESULTADO: N OK / 0 FAIL ===`. Por padrão os dados desta rodada não são removidos (mesma
política já documentada no QA da tarefa 01 — prefixo `[QA]`/`qa-<timestamp>-...@test.local`); rode
com `QA_CLEANUP=true` pra limpar só esta rodada, ou `npx tsx scripts/qa-cleanup-all.ts --apply` pra
limpar tudo de qualquer rodada/script antes de ir pra produção.

### O que testar depois de qualquer mudança futura nesta área

Além do checklist já registrado no QA da tarefa 01 (FKs pra `EnvironmentMember`, regras de Admin),
preste atenção especial se a mudança tocar em:

- Qualquer campo GraphQL não-nulo resolvido por `@FieldResolver` num tipo que pode aparecer dentro
  de uma lista não-nula retornada para o próprio usuário (ex.: `EnvironmentModel` dentro de
  `listMyEnvironments`) — se esse campo pode legitimamente "não se aplicar" pra um dos itens da
  lista (como `members` para um ambiente `pending`), ele precisa ser nullable e o resolver precisa
  devolver `null` em vez de lançar, senão um caso de borda anula a resposta inteira.
- Qualquer lugar que liste membros de um ambiente — confirmar que `pending` continua de fora
  (`listActiveMembers`) a menos que seja explicitamente `listPendingMembers` (Admin only).
