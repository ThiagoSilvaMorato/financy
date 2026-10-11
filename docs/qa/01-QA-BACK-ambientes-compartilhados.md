# 01 - QA-BACK - Ambientes compartilhados (contas conjuntas)

**Data:** 2026-10-10
**Plano:** [01-BACKEND-ambientes-compartilhados](../plans/01-BACKEND-ambientes-compartilhados.md)
**Registro de implementação:** [01-ambientes-compartilhados](../../backend/docs/01-ambientes-compartilhados.md)
**Resultado final:** ✅ **Passou — 68/68 verificações, 0 falhas**

## Escopo do QA

Testar o backend da feature "ambientes compartilhados" de ponta a ponta contra o servidor GraphQL
real (`http://localhost:4000/graphql`) e o banco de desenvolvimento real (Postgres via Neon,
mesmo `DATABASE_URL` do projeto), cobrindo especialmente os pontos que levaram 6 rodadas de
revisão do plano a serem fechados — porque são exatamente os pontos onde um bug passaria
despercebido no type-check mas quebraria em produção.

Fora de escopo: frontend (plano irmão ainda não implementado) e fluxo de e-mail de convite em si
(o envio é best-effort — erros do provedor de e-mail são logados e não bloqueiam a mutation,
conforme já implementado em `EmailService`).

## Método

1. Servidor subido localmente (`npm run dev`, porta 4000) contra o banco real do projeto.
2. Script de QA (`backend/scripts/qa-ambientes-compartilhados.ts`, mantido no repositório para
   reuso futuro — ver "Como reproduzir" abaixo) cria 2 usuários de teste com prefixo
   `qa-<timestamp>-`, executa a sequência completa de mutations/queries reais via HTTP (não chama
   services/Prisma diretamente, exceto nos pontos em que a verificação exige olhar o estado "por
   baixo" do schema GraphQL — ex.: confirmar que uma reentrada reaproveitou a linha em vez de
   duplicar).
3. Todo dado de teste é removido no final (sucesso ou falha) — usuários de teste deletados
   (cascade cuida do resto) e qualquer ambiente conjunto órfão removido explicitamente.
4. Confirmado, antes e depois da rodada, que os 2 usuários reais pré-existentes do projeto
   permanecem com exatamente 1 ambiente pessoal cada e nenhum dado alterado.

## O que foi verificado (mapeado aos riscos do plano)

| # | Cenário | Risco original (rodada de revisão) | Resultado |
|---|---|---|---|
| 1 | Registro cria ambiente pessoal automático, 1 membro, role admin | Migração/registro consistentes | ✅ |
| 2 | Criação de ambiente conjunto, criador já admin | — | ✅ |
| 3 | Transação atribuída a um membro real dentro do ambiente certo | — | ✅ |
| 4 | `memberId` de **outro** ambiente é rejeitado ao criar transação | Rodada 3 — invariante não garantida só pela FK | ✅ |
| 5 | Convite para o **ambiente pessoal** é rejeitado | Achado na verificação pós-implementação | ✅ |
| 6 | Convite → listagem pelo convidado → aceite → papel do convite aplicado | — | ✅ |
| 7 | Participante sem login: sem `userId`/`role`, pode ser atribuído a transação | — | ✅ |
| 8 | `promoteToAdmin` rejeita participante como alvo | Rodada 5 | ✅ |
| 9 | Múltiplos Admins: sair sem exigir sucessor quando outro Admin existe | Pedido explícito do usuário (múltiplos Admins) | ✅ |
| 10 | Último Admin não pode sair sem indicar sucessor | Rodada 2/4 | ✅ |
| 11 | Reentrada após saída **reaproveita a linha** (upsert), não duplica, não viola `@@unique` | Rodada 4 — contradição encontrada e corrigida no plano | ✅ |
| 12 | Transação antiga permanece íntegra após o autor sair e voltar do ambiente | Rodada 3 — motivo de existir o soft delete | ✅ |
| 13 | `removeMember`/`removeParticipant` rejeitam o "tipo" errado de membro | Rodada 5 | ✅ |
| 14 | Remoção simples de membro não-admin funciona e faz soft delete | Rodada 3 | ✅ |
| 15 | Cancelar convite pendente remove da listagem | Rodada 5 | ✅ |
| 16 | Recusar convite remove da listagem do convidado | Rodada 4 | ✅ |
| 17 | Remover participante é soft delete; transação dele permanece íntegra | Rodada 4/5 | ✅ |
| 18 | Exclusão de ambiente bloqueada com mais de 1 membro real ativo | Regra explícita do plano | ✅ |
| 19 | Ambiente pessoal nunca pode ser excluído | Regra explícita do plano | ✅ |
| 20 | Exclusão de ambiente apaga tudo em cascata (transações, membros) sem violar a FK `Restrict` | Rodada 3 — ordem de delete | ✅ |
| 21 | Renomear o ambiente pessoal é permitido (não é uma restrição da regra) | — | ✅ |

Resultado consolidado do script: **68 OK / 0 FAIL**.

## Bug encontrado e corrigido durante este QA

Na primeira execução, o passo 3 (criar transação e pedir `createdBy { id name }` na resposta)
falhou com:

```
Cannot return null for non-nullable field TransactionModel.createdBy.
```

**Causa raiz**: o `@FieldResolver` de `createdBy` em `TransactionResolver` tinha o método nomeado
`createdBy` (igual ao nome exposto no GraphQL), mas a propriedade do model que ele deveria
sobrescrever se chama `createdByUser` (nome diferente, por causa do conflito com o campo bruto
`createdBy: string` já existente na mesma classe). Como o nome do método não coincidia com o nome
da propriedade, o resolver auto-gerado pela propriedade (que lê `root.createdByUser`, sempre
`undefined` num objeto `Transaction` puro do Prisma) venceu silenciosamente — sem erro no
`buildSchema` nem no `tsc --noEmit`, só em tempo de execução ao resolver a resposta de uma query/
mutation real que pedisse esse campo.

**Correção**: renomeado o método para `createdByUser` (mantendo o decorator `{ name: "createdBy"
}`, que já controlava o nome exposto corretamente). Depois da correção, a suíte completa passou
68/68. Detalhes e o porquê em
[01-ambientes-compartilhados.md](../../backend/docs/01-ambientes-compartilhados.md#atualização-pós-qa-2026-10-10).

Esse achado confirma por que vale testar contra o schema GraphQL real (não só contra o Prisma
direto): é exatamente o tipo de problema que `tsc`, `prisma generate` e até um `buildSchema` bem-
sucedido não revelam — só aparece quando um client de fato pede aquele campo resolvido.

## Verificação de não-regressão

- `npx tsc --noEmit --skipLibCheck`: sem erros, antes e depois da correção.
- Os 2 usuários reais pré-existentes do projeto continuam com exatamente 1 ambiente (pessoal)
  cada, e nenhuma transação/categoria própria foi alterada pela rodada de teste.
- Banco de desenvolvimento confirmado limpo ao final: nenhum usuário, ambiente, categoria,
  transação, membro ou convite de teste restante.

## Log de execução (rodada final, após a correção)

```
=== QA Ambientes Compartilhados (run 1791685896883) ===
... (68 linhas "OK", 0 "FAIL") ...
=== RESULTADO: 68 OK / 0 FAIL ===

-- Limpeza dos dados de teste --
Removidos: 2 usuários de teste, 0 ambiente(s) órfão(s).
```

> Este log é de antes da mudança de política descrita em "Política de dados de teste" acima — na
> época, o script ainda limpava sozinho ao final de cada rodada. A limpeza por rodada, porém, só
> sabia procurar o ambiente conjunto pelo nome exato; não detectava ambientes **pessoais** órfãos
> dos usuários de teste deletados. Isso ficou evidente só mais tarde, quando o banco já acumulava
> 4 ambientes órfãos de rodadas anteriores a este log — corrigido na política atual, que usa
> `isPersonal: true` + zero membros como critério (não depende do nome).

## Conclusão

O backend da tarefa 01 (ambientes compartilhados) está **funcionando conforme o plano aprovado**,
incluindo todas as regras de negócio refinadas nas 6 rodadas de revisão. Um bug real foi
encontrado e corrigido durante este QA (campo `createdBy` nunca resolvia corretamente via GraphQL);
depois da correção, nenhuma falha restante. Frontend continua pendente, como já registrado no
documento de implementação.

---

## Política de dados de teste (atualizada em 2026-10-10)

Por decisão explícita do solicitante, o script **não limpa mais os próprios dados ao final de
cada rodada** por padrão — limpar a cada execução tem um custo (tempo/chamadas) que não vale a
pena pagar repetidamente durante o desenvolvimento. Em vez disso, **tudo que o script cria é
marcado com um prefixo fixo e fácil de filtrar**:

- Nome/título/descrição: prefixo `[QA]` (ex.: `[QA] Usuário A`, `[QA] Casa Teste`, `[QA] Mercado`).
- E-mail: `qa-<timestamp>-...@test.local` (domínio reservado, nunca entrega e-mail de verdade).

Antes de ir para produção, rode **uma única vez** o script de limpeza em massa, que apaga TUDO
marcado como QA de qualquer rodada anterior:

```bash
cd backend
npx tsx scripts/qa-cleanup-all.ts            # dry-run — mostra o que seria apagado
npx tsx scripts/qa-cleanup-all.ts --apply    # apaga de verdade
```

Esse script também cobre um caso que a limpeza antiga (por rodada) deixava passar: ambientes
**pessoais órfãos** — quando um usuário de teste é apagado, o `EnvironmentMember` dele é
cascateado, mas o `Environment` pessoal em si não tinha dono nenhum FK apontando pra `User`, então
sobrava como lixo sem nenhum membro. O critério de limpeza em massa cobre isso diretamente:
qualquer ambiente com `isPersonal: true` e zero membros é, por definição, órfão (nenhum usuário
real nunca fica sem seu próprio ambiente pessoal) — então é seguro apagar independente do nome.
**No momento em que este documento foi escrito, existem 4 ambientes órfãos desse tipo no banco de
desenvolvimento**, deixados por rodadas anteriores deste QA antes dessa política existir; ainda não
foram apagados (decisão deliberada de não gastar essa limpeza agora) — rode o comando `--apply`
acima quando for a hora.

Se quiser que uma rodada específica do script principal se limpe sozinha (comportamento antigo),
rode com a variável de ambiente `QA_CLEANUP=true`.

## Como reproduzir este teste

Este projeto não tem framework de testes configurado (`backend/CLAUDE.md` não lista
`jest`/`vitest` nem script de teste). Use um destes dois caminhos pra validar a feature de
ambientes compartilhados depois de qualquer mudança nela.

### Caminho 1 — Script automatizado (recomendado)

O script roda a sequência completa (convite, aceite, participante, soft delete, reentrada,
exclusão, todas as validações de borda) contra o servidor real. Por padrão **não limpa os dados
que cria** (ver "Política de dados de teste" acima) — é seguro rodar contra o banco de
desenvolvimento do projeto mesmo assim, porque tudo que ele cria é claramente identificável e
nunca toca em dados de usuários reais.

```bash
cd backend
npm run dev            # em um terminal — deixa o servidor rodando em :4000
```

Em outro terminal:

```bash
cd backend
npx tsx scripts/qa-ambientes-compartilhados.ts
```

Saída esperada: uma linha `OK`/`FAIL` por verificação, terminando em
`=== RESULTADO: N OK / 0 FAIL ===` seguido do aviso de que os dados desta rodada não foram
removidos (comportamento padrão — ver "Política de dados de teste" acima). Qualquer `FAIL` imprime
a mensagem de erro do GraphQL (ou a asserção) logo acima — é o suficiente pra localizar o
problema sem precisar reler o script inteiro.

Não precisa se preocupar em limpar depois de cada execução — isso é feito uma única vez, mais
tarde, com `qa-cleanup-all.ts` (ver acima). Se quiser que esta rodada específica se limpe sozinha,
rode com `QA_CLEANUP=true npx tsx scripts/qa-ambientes-compartilhados.ts`.

### Caminho 2 — Manual, via requisição HTTP direta

Útil pra inspecionar uma resposta específica (ex.: confirmar o formato exato de um erro) sem
reler/rodar o script inteiro. Qualquer cliente HTTP serve (`curl`, Postman, Insomnia, Apollo
Sandbox em `http://localhost:4000/graphql` com o servidor rodando).

#### 1. Criar dois usuários e pegar os tokens

```bash
curl -s http://localhost:4000/graphql -H 'content-type: application/json' -d '{
  "query": "mutation($data: RegisterInput!) { register(data: $data) { token user { id } } }",
  "variables": { "data": { "name": "[QA] Teste A", "email": "qa-manual-a@test.local", "password": "SenhaForte123!" } }
}'
```

Repita trocando nome/e-mail pra criar o "[QA] Teste B" (`qa-manual-b@test.local`). Guarde os dois
`token`s — toda chamada abaixo precisa do header `Authorization: Bearer <token>`. Use sempre o
prefixo `[QA]`/`qa-...@test.local` em qualquer coisa que você criar manualmente, pelo mesmo motivo
do script automatizado (ver "Política de dados de teste" acima).

#### 2. Confirmar o ambiente pessoal automático

```bash
curl -s http://localhost:4000/graphql -H 'content-type: application/json' \
  -H 'Authorization: Bearer <TOKEN_A>' -d '{
  "query": "query { listMyEnvironments { id name isPersonal members { id role userId } } }"
}'
```

Esperado: 1 ambiente, `isPersonal: true`, 1 membro com `role: "admin"` e `userId` igual ao id de A.

#### 3. Criar um ambiente conjunto e convidar B

```bash
curl -s http://localhost:4000/graphql -H 'content-type: application/json' \
  -H 'Authorization: Bearer <TOKEN_A>' -d '{
  "query": "mutation($data: CreateEnvironmentInput!) { createEnvironment(data: $data) { id name } }",
  "variables": { "data": { "name": "[QA] Casa Teste Manual" } }
}'
```

Guarde o `id` retornado (`<ENV_ID>`), depois:

```bash
curl -s http://localhost:4000/graphql -H 'content-type: application/json' \
  -H 'Authorization: Bearer <TOKEN_A>' -d '{
  "query": "mutation($data: InviteMemberInput!) { inviteMember(data: $data) { id role } }",
  "variables": { "data": { "environmentId": "<ENV_ID>", "email": "qa-manual-b@test.local", "role": "user" } }
}'
```

Guarde o `id` do convite (`<INVITE_ID>`).

#### 4. B vê e aceita o convite

```bash
curl -s http://localhost:4000/graphql -H 'content-type: application/json' \
  -H 'Authorization: Bearer <TOKEN_B>' -d '{
  "query": "query { listMyPendingInvites { id environment { name } invitedBy { name } role } }"
}'

curl -s http://localhost:4000/graphql -H 'content-type: application/json' \
  -H 'Authorization: Bearer <TOKEN_B>' -d '{
  "query": "mutation($inviteId: String!) { acceptEnvironmentInvite(inviteId: $inviteId) }",
  "variables": { "inviteId": "<INVITE_ID>" }
}'
```

#### 5. Casos que **devem** dar erro (teste negativo)

Confirme que cada um destes retorna um objeto `errors` (não apenas `data: null` silencioso):

- Convidar alguém pro **ambiente pessoal** de A (use o id do passo 2 em vez de `<ENV_ID>`).
- Criar uma transação em `<ENV_ID>` usando como `memberId` o id do membro de A no **ambiente
  pessoal** dele (não o do ambiente conjunto).
- B (se só ele for Admin) chamar `leaveEnvironment` sem passar `newAdminMemberId`.
- Chamar `deleteEnvironment` no ambiente pessoal de A.

#### 6. Limpeza

Seguindo a política atual (ver acima), **não precisa limpar manualmente** — como os nomes/e-mails
usados aqui já seguem o padrão `[QA]`/`qa-...@test.local`, o `qa-cleanup-all.ts` vai encontrar e
apagar tudo isso junto com o resto na limpeza em massa, quando ela for rodada. Se quiser mesmo
assim remover só o que você criou agora, apague os usuários de teste (cascade remove o resto):

```bash
cd backend && npx tsx -e '
import { prismaClient } from "./prisma/prisma";
prismaClient.user.deleteMany({ where: { email: { in: ["qa-manual-a@test.local", "qa-manual-b@test.local"] } } })
  .then(() => prismaClient.$disconnect());
'
```

Se um ambiente conjunto ficou sem nenhum membro (porque os dois usuários foram apagados sem
excluir o ambiente primeiro), ele fica órfão no banco — confira com
`prismaClient.environment.findMany({ where: { name: "[QA] Casa Teste Manual" } })` e apague manualmente se
aparecer.

### O que testar depois de qualquer mudança futura nesta área

Sempre que `environment.service.ts`, o schema Prisma dessas entidades, ou os resolvers de
`Transaction`/`Category` forem alterados, rode o Caminho 1 de novo. Preste atenção especial se a
mudança tocar em:

- Qualquer FK para `EnvironmentMember` (o soft delete existe por causa disso — ver
  [registro de implementação](../../backend/docs/01-ambientes-compartilhados.md)).
- Regras de Admin (promoção, remoção, saída) — o cenário de "último Admin" é fácil de regredir.
- Qualquer campo GraphQL resolvido por `@FieldResolver` cujo nome de método precise coincidir com
  o nome da propriedade do model (ver o bug documentado acima) — esse é exatamente o tipo de erro
  que só aparece pedindo o campo de verdade via GraphQL, nunca no `tsc`.
