# Backend — Financy

Stack: **Node.js + TypeScript + Express + Apollo Server + TypeGraphQL + Prisma + PostgreSQL**.

Fluxo de uma requisição:

```
Request → Express → Apollo Server → Resolver → Service → Prisma Client → PostgreSQL
                                        ↑
                                  Middleware (IsAuth) / Decorator (@GqlUser)
```

## Camadas

| Camada | Pasta | Responsabilidade |
|---|---|---|
| Resolver | `src/resolvers` | Camada GraphQL. Recebe `@Arg`/`@GqlUser`, chama o service e devolve o resultado. **Nunca contém lógica de negócio.** |
| Service | `src/services` | Regra de negócio e acesso a dados via Prisma. |
| Model | `src/models` | `@ObjectType()` — formato de saída da API. |
| DTO | `src/dto/input`, `src/dto/output` | `@InputType()`/tipos de retorno — formato de entrada/saída. |
| Middleware | `src/middleware` | Interceptadores de resolver (ex.: `IsAuth`). |
| GraphQL context/decorators | `src/graphql` | `buildContext` e decorators de parâmetro (`@GqlUser`). |
| Utils | `src/utils` | Funções puras e sem estado (hash, JWT). |
| Prisma | `prisma/` | Schema, migrations, client singleton (`prisma/prisma.ts`). |

## Padrões de projeto

- **Service Layer**: resolver fino, service gordo. Resolver nunca fala com o Prisma diretamente.
- **DTO explícito**: toda mutation/query usa `@InputType()` de entrada e `@ObjectType()` de saída — nunca parâmetros soltos.
- **Auth**: `@UseMiddleware(IsAuth)` + `@GqlUser()` para resolvers autenticados. Nunca confie em um `userId` vindo como argumento do client.
- **Field Resolvers** para dados relacionais (ex.: `category` em `TransactionResolver`) em vez de `include` cego no Prisma.
- **Prisma Client singleton**: sempre importar `prismaClient` de `prisma/prisma.ts`; nunca `new PrismaClient()` em um service.
- **DI com tsyringe**: hoje só `AuthService` usa `@singleton()`/`@inject()`; os demais services são instanciados com `new XService()` nos resolvers. Essa inconsistência é conhecida — ao criar um service com dependências, siga o padrão do `AuthService`; não misture os dois estilos no mesmo arquivo.

## Boas práticas obrigatórias

### Reutilização de código
- Lógica pura sem dependência de banco vai para `src/utils`. Verifique se já existe antes de escrever de novo.
- A verificação "o recurso existe e pertence a este usuário" se repete em quase todo método de `TransactionService`/`CategoryService` (`if (!x || x.userId !== userId) throw ...`). Ao adicionar um método novo, prefira extrair isso para um helper compartilhado em vez de copiar o padrão.
- Cuidado com lógica duplicada entre front e back (ex.: normalização de valores monetários em string) — se mexer em uma, confira a outra.

### Refatoração quando necessário
Não é preciso reescrever tudo de uma vez — refatore quando a dor aparecer:
- Service crescendo demais → separe por responsabilidade antes de empilhar mais um método.
- `validate: false` no `buildSchema` (`index.ts`) significa que não há validação declarativa de DTO hoje; se um bug vier de input inválido, considere introduzir `class-validator` em vez de só adicionar mais um `if` manual.
- Erros de negócio usam `throw new Error("...")` em português; erros de auth usam `GraphQLError` com `extensions.code`. São dois padrões convivendo — ao tocar em um fluxo de erro, prefira padronizar para `GraphQLError` com `extensions.code`.

### Código do escoteiro (sempre que mexer em algo, deixe melhor)
- Remova `any` desnecessário quando o arquivo já estiver aberto para outra mudança.
- Nunca deixe `console.error` sem logar o erro original.
- Não deixe código morto/comentado no arquivo que você está editando.
- Prefira idioma consistente nas mensagens de erro (hoje majoritariamente pt-BR).

### Outras boas práticas
- Toda alteração de schema passa por `npm run migrate`; depois rode `npm run generate` antes de usar os novos campos no código.
- Operações que afetam múltiplas tabelas de forma atômica usam `$transaction` (ver `deleteCategory`).
- Senhas sempre via `hashPassword`/`comparePassword`; nunca comparar senha em texto puro.
- Tokens: reuse `generateTokens` do `AuthService` em vez de assinar JWT manualmente em outro lugar.
- CORS é restrito por allowlist (`CORS_ORIGIN`); não abra `origin: "*"` para depurar.

## Convenções de nomenclatura
- Arquivos: `<entidade>.<camada>.ts` (`transaction.resolver.ts`, `transaction.service.ts`, ...).
- Classes: `<Entidade><Camada>` (`TransactionResolver`, `TransactionService`, ...).
- Um resolver e um service por entidade/agregado.

## Scripts

```bash
npm install
npm run migrate      # aplica migrations do Prisma
npm run generate      # gera o Prisma Client
npm run dev           # inicia o servidor com hot reload
npm run seed          # popula o banco com dados de exemplo
```

## Fluxo obrigatório de uma tarefa

Toda tarefa (feature, fix, refactor) passa por duas etapas obrigatórias: **1) planejar e obter
aprovação antes de implementar** e **2) registrar a decisão depois de implementar**. Essa regra é
a mesma nos dois lados do projeto (ver também `frontend/CLAUDE.md`).

### 1. Planejamento e aprovação (antes de implementar)

Antes de escrever qualquer código, criar um plano descrevendo a tarefa. Como o projeto é
full-stack, uma mesma tarefa normalmente gera **um plano para o backend e um para o frontend**
(exceto quando a tarefa comprovadamente afeta só um dos lados — nesse caso, crie apenas o plano
correspondente).

- Os planos ficam em **`docs/plans`** na raiz do projeto (`../docs/plans`, compartilhada entre
  frontend e backend), nunca dentro de `backend/docs` ou `frontend/docs`.
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

Ao concluir a tarefa, criar um arquivo markdown em [`docs/`](docs/) (aqui no backend) descrevendo
a tarefa, e referenciar (link relativo) o plano aprovado em `docs/plans` que a originou. Nome do
arquivo: `docs/AAAA-MM-DD-slug-da-tarefa.md`.

Template:

```markdown
# <Título da tarefa>

**Data:** AAAA-MM-DD
**Plano:** [NN-BACKEND-slug](../docs/plans/NN-BACKEND-slug.md)

## O que foi feito
Descrição objetiva do que foi criado/alterado (arquivos, endpoints, resolvers, services, etc.).

## Por que foi feito
O problema, necessidade ou pedido que motivou a tarefa.

## Por que esse caminho foi escolhido
A abordagem/padrão escolhido, alternativas consideradas e o motivo da escolha (trade-offs,
aderência aos padrões deste CLAUDE.md, limitações aceitas, etc.).
```

Não é necessário plano nem doc para mudanças triviais (typo, ajuste de lint). Ambos são
obrigatórios para qualquer tarefa que adicione/altere comportamento, schema, endpoint ou padrão de
código.
