# 03 - QA-BACK - Pagamento em crédito (parcelamento)

**Data:** 2026-10-20
**Plano:** [03-BACKEND-pagamento-credito](../plans/03-BACKEND-pagamento-credito.md)
**Registro de implementação:** [03-pagamento-credito](../../backend/docs/03-pagamento-credito.md)
**Resultado final:** ✅ **Passou — 59/59 verificações, 0 falhas**

## Escopo do QA

Testar o backend da feature "pagamento em crédito (parcelamento)" de ponta a ponta contra o
servidor GraphQL real (`http://localhost:4000/graphql`) e o banco de desenvolvimento real
(Postgres via Neon, mesmo `DATABASE_URL` do projeto), cobrindo especialmente os pontos do plano
que vieram de rodadas de revisão (aritmética de dinheiro em centavos, overflow de mês, checagem de
categoria/ambiente, limites de `installmentsCount`, e as duas exclusões em cascata que precisaram
ganhar um `installmentPurchase.deleteMany` explícito).

Fora de escopo: frontend (plano irmão ainda não implementado) e qualquer ação de cancelar parcelas
futuras em massa ou editar o parcelamento inteiro propagando pra todas as parcelas (fora do escopo
da própria tarefa, por decisão explícita do solicitante).

## Método

1. Servidor subido localmente (`npm run dev`, porta 4000) contra o banco real do projeto.
2. Migration (`20261020034201_pagamento_credito`) aplicada previamente com `prisma migrate
   deploy`.
3. Script de QA (`backend/scripts/qa-pagamento-credito.ts`, mantido no repositório para reuso
   futuro — ver "Como reproduzir" abaixo) cria 2 usuários de teste com prefixo `qa-<timestamp>-`,
   executa a sequência completa de mutations/queries reais via HTTP, e consulta o Prisma
   diretamente só nos pontos em que a verificação exige olhar o estado "por baixo" do schema
   GraphQL (ex.: confirmar que um `InstallmentPurchase` foi de fato removido do banco, não só que
   a query parou de devolvê-lo).
4. Nenhum dado de teste foi removido automaticamente ao final (política atual do projeto — ver
   `docs/qa/01-QA-BACK-ambientes-compartilhados.md`); tudo criado tem prefixo `[QA]` em
   nome/descrição e e-mail `qa-<timestamp>-...@test.local`.
5. Nenhum dado pré-existente do projeto foi tocado: todas as operações do script atuam só sobre
   os ambientes/usuários criados pelo próprio script (escopados por `assertEnvironmentAccess`), e
   nenhuma query/mutation usada lista ou altera dados de outros usuários.

## O que foi verificado (mapeado aos riscos do plano)

| # | Cenário | Risco original (plano) | Resultado |
|---|---|---|---|
| 1 | Compra parcelada por valor TOTAL (R$1000,00 em 3x) retorna 3 transações | — | ✅ |
| 2 | Soma das 3 parcelas bate exatamente R$1000,00 (centavos inteiros, sem erro de float) | Seção "Dinheiro" | ✅ |
| 3 | `description` já formatada "Nome 1/3", "Nome 3/3" na criação (não calculada depois) | Materialização | ✅ |
| 4 | `installmentNumber` 1, 2, 3 na ordem certa | Ordenação do `createManyAndReturn` (achado de implementação, ver abaixo) | ✅ |
| 5 | As 3 parcelas compartilham o mesmo `installmentPurchaseId` | — | ✅ |
| 6 | Data da parcela 1 = 31/01; parcela 2 = 28/02 (overflow de mês, não 03/03); parcela 3 = 31/03 | Seção "Datas" — `addMonths` vs. `Date` nativo | ✅ |
| 7 | `InstallmentPurchase.totalAmount`/`installmentAmount` persistidos corretos (333.33 x2 + 333.34) | Resto na última parcela | ✅ |
| 8 | Cada parcela aparece em `listTransactions` com a mesma data/valor, em 3 meses diferentes | "Nenhuma tela existente precisa saber que parcelamento existe" | ✅ |
| 9 | Compra parcelada por valor DA PARCELA (R$300,00 x 4 = R$1200,00), sem resto a redistribuir | Multiplicação em centavos (não float direto) | ✅ |
| 10 | `type` inválido é rejeitado | Validação 1 | ✅ |
| 11 | Usuário sem acesso ao ambiente é rejeitado | Validação 2 (`assertEnvironmentAccess`) | ✅ |
| 12 | `memberId` de outro ambiente é rejeitado | Validação 2 (`assertMemberBelongsToEnvironment`) | ✅ |
| 13 | `categoryId` de outro ambiente é rejeitado | Achado de revisão — checagem nova que `createTransaction` não tem | ✅ |
| 14 | `installmentsCount = 1` rejeitado; `= 61` rejeitado; `= 2` e `= 60` aceitos (60 transações reais criadas) | Limites 2–60 | ✅ |
| 15 | `amount` não numérico e `amount <= 0` rejeitados | Validação 5 | ✅ |
| 16 | `updateTransaction` edita a descrição de uma parcela isolada livremente | Escopo: só edição isolada | ✅ |
| 17 | `installmentPurchaseId`/`installmentNumber` preservados após `updateTransaction` | `CreateTransactionInput` não aceita esses campos (não há como sobrescrevê-los) | ✅ |
| 18 | `deleteTransaction` exclui uma parcela isolada; `InstallmentPurchase` sobrevive (não cascateia pro agrupador) | Escopo: só exclusão isolada | ✅ |
| 19 | `deleteCategory` remove o `InstallmentPurchase` vinculado (sem órfão, sem erro de FK) | Achado de revisão — `installmentPurchase.deleteMany` explícito em `deleteCategory` | ✅ |
| 20 | `deleteEnvironment` remove o `InstallmentPurchase` vinculado (sem órfão, sem erro de FK) | Achado de revisão — `installmentPurchase.deleteMany` explícito em `deleteEnvironment`, antes de `environmentMember.deleteMany` | ✅ |

Resultado consolidado do script: **59 OK / 0 FAIL**.

## Bug encontrado e corrigido durante este QA

Na implementação inicial, `createInstallmentPurchase` usava uma transação interativa do Prisma
(`$transaction(async (tx) => { ...await tx.installmentPurchase.create(...); for (...) await
tx.transaction.create(...) })`), criando o agrupador e depois cada parcela em `await` sequencial
dentro do mesmo callback.

Isso passou no `tsc --noEmit` e funcionou para parcelamentos pequenos (2, 3, 4 parcelas), mas
**falhou no teste do limite superior (60 parcelas)** com:

```
Transaction API error: Transaction not found. Transaction ID is invalid, refers to an old closed
transaction Prisma doesn't have information about anymore, or was obtained before disconnecting.
```

**Causa raiz**: 60 `await`s sequenciais contra o Postgres real (Neon, com latência de rede)
excederam o timeout padrão de transação interativa do Prisma (5s). O erro só aparece com volume
real de parcelas — nenhum teste unitário ou de tipos pegaria isso.

**Correção**: trocado para `$transaction` em **array** (mesmo padrão já usado em
`deleteEnvironment`/`deleteCategory`), com o `InstallmentPurchase` recebendo um `id` gerado
explicitamente via `crypto.randomUUID()` (em vez do `@default(uuid())` do schema) para poder ser
referenciado nas N transações já na mesma chamada, e as N transações criadas de uma vez com
`transaction.createManyAndReturn` (uma única operação em lote, não N round-trips). Isso eliminou o
timeout e manteve a atomicidade (tudo ou nada). Como efeito colateral, `createManyAndReturn` não
garante a ordem das linhas devolvidas pelo banco — o service passou a ordenar explicitamente por
`installmentNumber` antes de devolver.

## Como reproduzir

```bash
cd backend
npm run dev                              # servidor em http://localhost:4000
npx tsx scripts/qa-pagamento-credito.ts  # roda as 59 verificações, não limpa ao final

# para limpar só esta rodada:
QA_CLEANUP=true npx tsx scripts/qa-pagamento-credito.ts

# para limpar TODO dado de QA de qualquer rodada/script, antes de ir pra produção:
npx tsx scripts/qa-cleanup-all.ts --apply
```
