# 04 - FRONTEND - Loading e desabilitação de botões durante chamadas de API

**Status:** Concluído ([registro de decisão](../../frontend/docs/04-loading-botoes.md))
**Data:** 2026-10-20

## Objetivo

Todo botão que dispara uma chamada de API deve, enquanto aquela chamada específica estiver em
andamento: (1) ficar desabilitado e (2) mostrar um indicador visual de carregamento. Hoje isso não
existe de forma visual em nenhum botão do app — alguns poucos (Login, Signup, RecoverPassword,
ResetPassword, Profile) já desabilitam o botão via um `useState` manual, mas nenhum mostra
indicador nenhum, e a maioria dos botões (categorias, transações, gestão de ambiente) não tem
nenhum tratamento hoje.

Também foi pedido que apertar Enter no formulário de login dispare o botão "Entrar". **Achado da
investigação**: isso já funciona hoje, sem nenhuma mudança de código — o formulário de login
(`pages/Login/index.tsx`) já é um `<form onSubmit={handleSubmit(handleFormSubmit)}>` de verdade,
com um `<Button type='submit'>` dentro, e nenhum input intercepta a tecla Enter. Esse é o
comportamento padrão de qualquer `<form>` HTML. Não há nenhum item de implementação para isso
neste plano — só um passo de confirmação manual no QA, pra garantir que a leitura do código bate
com o comportamento real no navegador. Se o solicitante perceber esse comportamento ausente ao
testar de verdade, é sinal de que o problema está em outro lugar (ex.: um estado de erro
"preso" impedindo o submit) e não na falta do recurso — vale investigar antes de adicionar um
`onKeyDown` manual que seria redundante.

**Decisão desta revisão**: em vez de repetir um `useState` + `try/finally` manual em cada um dos
componentes com `onClick` direto (ver seção 4), esse estado é centralizado em dois hooks novos
reutilizáveis (seção 2) — nenhum desses ~13 componentes volta a escrever seu próprio
`useState<boolean>`/`useState<Set<string>>` de loading.

## Abordagem proposta

### 1. Novo `loading` no `Button` (`src/components/ui/button.tsx`)

Esse arquivo é o primitivo de design system (`components/ui`, "sem regra de negócio" por
convenção do `frontend/CLAUDE.md`) — é o lugar certo pra um comportamento puramente visual
reutilizado em ~20 lugares, em vez de duplicar um spinner em cada chamador.

- Novo prop `loading?: boolean` (default `false`).
- Quando `loading` é `true`: o botão renderiza um ícone `Loader2` (de `lucide-react`, já é
  dependência do projeto — hoje não usado em lugar nenhum, mas disponível) com a classe
  `animate-spin` do Tailwind, antes do conteúdo (`children`) do botão; e fica desabilitado —
  `disabled={disabled || loading}` (mescla com qualquer `disabled` que o chamador já estava
  passando por regra de negócio, ex.: `blocksLastAdmin` em `MembersList`). Também seta
  `aria-busy={loading || undefined}` pra acessibilidade.
- `buttonVariants` já tem `disabled:pointer-events-none disabled:opacity-50` e
  `[&_svg]:size-4 [&_svg]:shrink-0` — o ícone de loading já herda o tamanho/clipping certo sem
  CSS novo.
- Import novo necessário no topo do arquivo: `import { Loader2 } from "lucide-react"`.
- **Ressalva sobre `asChild`**: quando `asChild` é `true`, o `Button` renderiza um Radix `Slot`,
  que exige exatamente um elemento filho (ele clona esse filho e mescla os props nele) — não
  é possível injetar um segundo elemento (o spinner) ao lado dos `children` nesse modo sem
  quebrar essa regra do Slot. Na prática, nenhum dos ~20 botões que disparam API usa `asChild`
  (é usado só pra navegação, ex.: um botão estilizado que na verdade é um link) — então o spinner
  só é injetado quando `asChild` for `false`/omitido; com `asChild: true`, `loading` continua
  mesclando o `disabled`, mas não desenha o ícone.

```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && !asChild && <Loader2 className='animate-spin' />}
        {children}
      </Comp>
    );
  }
);
```

### 2. Dois hooks novos pra centralizar o estado de loading (`src/hooks/`)

Pasta nova no projeto — hoje não existe `src/hooks`, só `stores` (Zustand, estado global),
`utils` (funções puras) e lógica local direto nos componentes. Um hook de UI local (sem Zustand,
sem acesso a store global) se encaixa como uma categoria própria, reutilizada entre features —
mesmo critério de "sobe pra uma pasta compartilhada" que `frontend/CLAUDE.md` já usa pra
`components`/`shared`/`utils`.

Os ~13 componentes com `onClick` direto (seção 4) caem em exatamente dois formatos — "uma ação,
um alvo fixo" e "uma lista de itens, cada um com sua própria ação" — então dois hooks bastam pra
cobrir todos eles, sem nenhum componente escrever seu próprio `useState` de loading.

#### `useAsyncAction` — um alvo fixo (modais de confirmação, botões isolados)

```ts
// src/hooks/useAsyncAction.ts
import { useCallback, useState } from "react";

export function useAsyncAction() {
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (action: () => Promise<void> | void) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, run };
}
```

Uso típico (ex.: `DeleteEnvironmentModal`):
```tsx
const { loading: isDeleting, run } = useAsyncAction();
...
<Button variant='destructive' loading={isDeleting} onClick={() => run(handleConfirm)}>
  Confirmar
</Button>
```

#### `usePendingKeys` — listas, uma ação por item (ou mais de uma ação por item)

```ts
// src/hooks/usePendingKeys.ts
import { useCallback, useState } from "react";

export function usePendingKeys() {
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  const run = useCallback(async (key: string, action: () => Promise<void> | void) => {
    setPendingKeys((prev) => new Set(prev).add(key));
    try {
      await action();
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, []);

  const isPending = useCallback((key: string) => pendingKeys.has(key), [pendingKeys]);

  return { isPending, run };
}
```

Por que não dá pra usar um único valor (`string | null`) em vez de um `Set`: num componente de
lista, duas ações em **itens diferentes** podem ficar pendentes ao mesmo tempo (ex.: remover o
membro A e, antes da resposta voltar, promover o membro B). Um valor único faria o segundo clique
sobrescrever o estado do primeiro — o botão do membro A pararia de mostrar loading/desabilitado
mesmo com a chamada dele ainda em andamento no servidor, o oposto do que foi pedido ("aquele
botão" desabilitado até terminar, não "o último clicado"). O `Set` suporta qualquer número de
chaves pendentes ao mesmo tempo, sem uma apagar a outra.

Uso típico com uma ação por item (`ParticipantsList`) — mesmo cuidado de escopo do exemplo
abaixo: `usePendingKeys()` chamado uma vez só no topo do componente, fora do `.map()`:
```tsx
export const ParticipantsList = (/* ...props... */) => {
  const { isPending, run } = usePendingKeys(); // uma vez só, fora do .map()

  return (
    // ...
    participants.map((participant) => (
      <Button
        key={participant.id}
        loading={isPending(participant.id)}
        onClick={() => run(participant.id, () => handleRemove(participant.id))}
      >
        Remover
      </Button>
    ))
  );
};
```

Uso típico com duas ações por item (`MembersList`, chave = `` `${memberId}:${ação}` ``).
**Importante**: o hook é chamado **uma vez só, no topo do componente da lista** (fora do
`.map()`) — é um único `Set` compartilhado por todos os itens que o torna possível ter várias
ações pendentes ao mesmo tempo em membros diferentes. Só a *chave* (string, não um hook) é
calculada de novo a cada item, dentro do `.map()`:
```tsx
export const MembersList = (/* ...props... */) => {
  const { isPending, run } = usePendingKeys(); // uma vez só, fora do .map()

  return (
    // ...
    members.map((member) => {
      const promoteKey = `${member.id}:promote`; // recalculada por item, não é hook
      const removeKey = `${member.id}:remove`;

      return (
        <div key={member.id} /* ... */>
          <Button
            variant='outline' size='sm'
            loading={isPending(promoteKey)}
            disabled={isPending(removeKey)}
            onClick={() => run(promoteKey, () => handlePromote(member.id))}
          >
            Promover a Admin
          </Button>
          <Button
            variant='outline' size='sm'
            loading={isPending(removeKey)}
            disabled={blocksLastAdmin || isPending(promoteKey)}
            onClick={() => run(removeKey, () => handleRemove(member.id))}
          >
            Remover
          </Button>
        </div>
      );
    })
  );
};
```
Note que o botão "Remover" preserva seu `disabled={blocksLastAdmin}` de negócio já existente,
somado (não substituído) à condição nova — e cada botão fica bloqueado enquanto **qualquer uma**
das duas ações daquele mesmo item está em andamento (a própria, via `loading`, que o `Button` já
funde em `disabled`; e a irmã, via esse `disabled` explícito), sem afetar os botões de nenhum
outro item da lista.

### 3. Botões dentro de formulário `react-hook-form` (`handleSubmit`) — não usam os hooks novos

O React Hook Form já expõe `formState.isSubmitting` — fica `true` automaticamente enquanto a
função `async` passada pro `handleSubmit` (o `handleFormSubmit` de cada tela) não resolve/rejeita,
sem precisar de nenhum `useState` novo. Isso **já é**, na prática, a mesma centralização que os
hooks da seção 2 oferecem pros casos de `onClick` — só que de graça, vinda do próprio
`useForm()`. Repetir `useAsyncAction` por cima disso adicionaria um segundo estado redundante pra
controlar a mesma coisa; a escolha aqui é usar o que o RHF já dá, não os hooks novos.

Hoje **nenhuma tela usa isso** — Login, Signup, RecoverPassword, ResetPassword têm um `useState`
manual fazendo a mesma coisa (sem mostrar indicador), e NewCategoryModal/TransactionFormModal/
CreateParticipantModal/RenameEnvironmentModal/CreateEnvironmentModal/JoinByCodeModal (passo de
preview) não têm nada.

Abordagem única pra todos esses: destruturar `isSubmitting` de `formState` e passar
`loading={isSubmitting}` (sem precisar de `disabled` adicional, já que `loading` cobre isso) pro
`Button type='submit'`. Nas telas que já têm um `useState` manual equivalente
(`Login`/`Signup`/`RecoverPassword`/`ResetPassword`), remover esse estado — fica redundante e
`isSubmitting` é mais correto (reseta automaticamente mesmo se a validação do yup falhar antes de
chamar a API, caso em que `handleFormSubmit` nem chega a rodar).

**Cuidado ao remover o `loading` de `RecoverPassword`**: esse arquivo tem um segundo botão
("Fazer login", navegação pura, `onClick={() => navigate("/")}`, sem chamada de API) que hoje
também usa `disabled={loading}` só pra não deixar o usuário navegar fora enquanto o pedido de
recuperação está em andamento. Removendo a variável `loading` sem atualizar essa segunda
referência quebra o build (variável inexistente) — trocar esse `disabled={loading}` por
`disabled={isSubmitting}` junto, mantendo o mesmo comportamento (esse botão continua sem `loading`
no sentido de spinner, já que não chama API — só o `disabled` precisa seguir existindo).

Afetados: `pages/Login`, `pages/Signup`, `pages/RecoverPassword`, `pages/ResetPassword`,
`pages/Category/components/NewCategoryModal`, `components/TransactionFormModal` (o mesmo botão
cobre os 3 caminhos — criar transação, editar, criar compra parcelada — `isSubmitting` funciona
igual nos três, já que os três são chamados de dentro do mesmo `handleFormSubmit` async),
`pages/EnvironmentManagement/components/CreateParticipantModal`,
`pages/EnvironmentManagement/components/RenameEnvironmentModal`,
`pages/Profile/components/EnvironmentsTab/components/CreateEnvironmentModal`,
`pages/Profile/components/EnvironmentsTab/components/JoinByCodeModal` (só o botão do passo de
preview — o passo de confirmação é `onClick` puro, ver seção 4, usa `useAsyncAction`).

### 4. Botões com `onClick` direto — todos usando `useAsyncAction`/`usePendingKeys`

- **Um botão, uma ação, um alvo fixo** → `useAsyncAction`: `ConfirmDeleteCategoryModal`,
  `ConfirmDeleteTransactionModal`, `LeaveEnvironmentModal`, `DeleteEnvironmentModal`, o passo de
  confirmação do `JoinByCodeModal`, `EnvironmentManagementHeader` (botão "Definir como padrão") e
  `InviteCodeCard` (`handleGenerate`, compartilhado pelos dois botões de gerar código — nunca
  aparecem os dois ao mesmo tempo na tela, um só `useAsyncAction` cobre ambos sem ambiguidade). Em
  `pages/Profile/index.tsx`, **duas** instâncias independentes de `useAsyncAction` — uma pra
  "Salvar Alterações", outra pra "Sair da conta" — corrigindo o bug pré-existente descrito na
  seção 6.
- **Listas** → `usePendingKeys`: `ParticipantsList` (chave = id do participante),
  `MembersList`/`PendingMembersList` (chave = `` `${id}:${ação}` ``, ver exemplo completo na
  seção 2).

**Detalhe confirmado lendo o código, válido pros modais de confirmação de exclusão**: em
`ConfirmDeleteCategoryModal` e `ConfirmDeleteTransactionModal`, quem faz a chamada de verdade
(`categoryService.deleteCategory`/`transactionService.deleteTransaction`) é o componente **pai**
(`CategoryCard`/`pages/Transactions/index.tsx`), não o modal — o modal só recebe
`onConfirm: () => Promise<void> | void` como prop. O hook `useAsyncAction` fica local no próprio
modal mesmo assim, só que `run(onConfirm)` está envolvendo a *chamada da prop*, não um service
direto — funciona porque a prop já é tipada retornando `Promise<void> | void` nos dois casos, não
precisa tocar no componente pai.

**Correção de tipo necessária em `EnvironmentManagementHeader`**: a prop `onSetDefault` está
tipada hoje como `() => void` em `EnvironmentManagementHeaderProps`, mas a função real passada
pelo pai (`handleSetDefault` em `EnvironmentManagement/index.tsx`) é `async` e retorna uma Promise
de verdade (o tipo está incompleto/mentindo sobre o próprio contrato). Como `run(onSetDefault)`
vai `await`ar essa prop, aproveitar pra corrigir o tipo pra `onSetDefault: () => Promise<void> | void`,
igual já é o tipo de `onConfirm` nos modais de confirmação acima.

### 5. Botões que já têm um ícone próprio antes do texto

O `Button` sempre desenha o spinner **antes** dos `children`, sem tocar no que o chamador passou
— ele não tem como saber se um nó dentro de `children` "é um ícone" pra substituir. Isso é
suficiente pra quase todos os ~20 botões (a maioria é só texto), mas 3 deles já renderizam um
ícone próprio antes do texto, e ligar `loading` neles sem ajustar nada deixaria **dois ícones ao
mesmo tempo** (o spinner novo + o ícone de negócio antigo) enquanto a chamada está em andamento:

- `pages/Profile/index.tsx`, botão "Sair da conta": `<LogOut className='text-red-400' /> Sair da conta`.
- `pages/EnvironmentManagement/components/EnvironmentManagementHeader/index.tsx`, botão "Definir
  como padrão": `<Star /> Definir como padrão`.
- `pages/EnvironmentManagement/components/InviteCodeCard/index.tsx`, botão "Gerar código de
  convite" (o caso de ainda não existir nenhum código — o outro, "Gerar novo código", só abre o
  diálogo e está fora de escopo): `<RefreshCw /> Gerar código de convite`.

(Confirmado lendo cada um dos outros ~17 botões que recebem `loading` neste plano — todos
renderizam só texto, sem ícone próprio, então não têm esse conflito.)

Correção nesses 3: esconder o ícone de negócio enquanto `loading` for `true`, em vez de tentar
fazer o `Button` adivinhar isso sozinho — ex.:
```tsx
const { loading: isSettingDefault, run } = useAsyncAction();
...
<Button loading={isSettingDefault} onClick={() => run(onSetDefault)}>
  {!isSettingDefault && <Star />}
  Definir como padrão
</Button>
```

### 6. Correções colaterais encontradas nos arquivos que serão tocados

Já que esses arquivos vão ser abertos e editados mesmo, duas correções pequenas e relacionadas
(código do escoteiro, `frontend/CLAUDE.md`):

- **`pages/Profile/index.tsx` tem um bug pré-existente**: o botão "Salvar Alterações"
  (`handleUpdateUser`) e o botão de logout (`handleLogout`) compartilham a mesma variável
  `loading` — só `handleLogout` a modifica hoje, então "Salvar Alterações" nunca reage à própria
  chamada, só fica desabilitado de carona enquanto o *logout* está em andamento. Esse trabalho já
  exige um `useAsyncAction` próprio pra cada botão (seção 4), então a correção é natural: duas
  instâncias independentes, uma por ação.
- **`handleLogout`'s catch em `Profile/index.tsx`** hoje é `console.error("Erro ao sair da conta.")`
  — nem loga o erro real (é uma string fixa), nem avisa o usuário, violando a boa prática já
  documentada no `CLAUDE.md`. Como esse bloco já está sendo tocado, troca esse `console.error` por
  `toast.error(error instanceof Error ? error.message : "Erro ao sair da conta.")` — o mesmo
  padrão já usado em todo o resto do app (`MembersList`, `LeaveEnvironmentModal`, etc.), não soma
  um toast por cima do console.error, substitui.

## Arquivos/áreas afetadas

- `hooks/useAsyncAction.ts` — novo.
- `hooks/usePendingKeys.ts` — novo.
- `components/ui/button.tsx` — novo prop `loading`.
- `pages/Login/index.tsx`, `pages/Signup/index.tsx`, `pages/RecoverPassword/index.tsx`,
  `pages/ResetPassword/index.tsx` — troca de `useState` manual por `formState.isSubmitting`.
- `pages/Profile/index.tsx` — duas instâncias de `useAsyncAction` (atualizar perfil / logout),
  toast no catch do logout, e esconder o ícone `LogOut` do botão de logout enquanto `loading`.
- `pages/Category/components/NewCategoryModal/index.tsx` — `isSubmitting`.
- `pages/Category/components/CategoryList/components/CategoryCard/ConfirmDeleteCategoryModal/index.tsx` —
  `useAsyncAction`.
- `components/TransactionFormModal/index.tsx` — `isSubmitting`.
- `pages/Transactions/components/ConfirmDeleteTransactionModal/index.tsx` — `useAsyncAction`.
- `pages/EnvironmentManagement/components/InviteCodeCard/index.tsx` — `useAsyncAction` +
  esconder o ícone `RefreshCw` do botão "Gerar código de convite" enquanto `loading`.
- `pages/EnvironmentManagement/components/MembersList/index.tsx` — `usePendingKeys` (chaves
  `` `${memberId}:promote` ``/`` `${memberId}:remove` ``).
- `pages/EnvironmentManagement/components/PendingMembersList/index.tsx` — `usePendingKeys` (chaves
  `` `${memberId}:approve` ``/`` `${memberId}:remove` ``).
- `pages/EnvironmentManagement/components/ParticipantsList/index.tsx` — `usePendingKeys` (chave =
  id do participante, uma ação só).
- `pages/EnvironmentManagement/components/CreateParticipantModal/index.tsx` — `isSubmitting`.
- `pages/EnvironmentManagement/components/RenameEnvironmentModal/index.tsx` — `isSubmitting`.
- `pages/EnvironmentManagement/components/LeaveEnvironmentModal/index.tsx` — `useAsyncAction`.
- `pages/EnvironmentManagement/components/DeleteEnvironmentModal/index.tsx` — `useAsyncAction`.
- `pages/EnvironmentManagement/components/EnvironmentManagementHeader/index.tsx` —
  `useAsyncAction`, corrige o tipo de `onSetDefault` pra `() => Promise<void> | void`, e esconde
  o ícone `Star` do botão "Definir como padrão" enquanto `loading`.
- `pages/Profile/components/EnvironmentsTab/components/CreateEnvironmentModal/index.tsx` —
  `isSubmitting`.
- `pages/Profile/components/EnvironmentsTab/components/JoinByCodeModal/index.tsx` — `isSubmitting`
  no passo de preview + `useAsyncAction` no passo de confirmação.

## Riscos e alternativas consideradas

- **Fora de escopo, propositalmente**: botões que só abrem modais ou só navegam/trocam estado
  local sem chamar API — os ícones de lápis/lixeira nas listas (que só abrem um modal de
  confirmação/edição), "Nova Transação"/"Criar ambiente conjunto"/"Entrar com código" (só abrem
  modal), `EnvironmentSwitcher` (troca de ambiente é só Zustand local, sem chamada), e o botão de
  copiar código de convite em `InviteCodeCard` (`navigator.clipboard.writeText`, não é uma chamada
  ao backend). Nenhum desses recebe `loading`.
- **Por que dois hooks (`useAsyncAction`/`usePendingKeys`) em vez de um só**: um hook único que
  tentasse cobrir os dois casos precisaria sempre de uma chave (string) mesmo nos componentes de
  alvo fixo, que não têm nenhum id natural pra usar — forçaria uma chave artificial tipo `"default"`
  em todo lugar sem lista. Dois hooks pequenos e com a assinatura mais simples possível pra cada
  caso (`run(action)` vs `run(key, action)`) é mais direto que um hook genérico com uma chave
  opcional.
- **Por que `formState.isSubmitting` do React Hook Form não usa os hooks novos**: já é a mesma
  centralização, só que fornecida de graça pelo `useForm()` — duplicar com `useAsyncAction` por
  cima adicionaria um segundo estado controlando a mesma coisa, sem ganho nenhum.
- **Por que estender o `Button` em vez de criar um `LoadingButton` novo**: um componente novo
  duplicaria toda a lógica de variantes/tamanhos do `Button` já existente, e o pedido é que
  **todo** botão que chama API tenha esse comportamento — faz mais sentido o primitivo já nascer
  com a capacidade do que forçar uma troca de componente em ~20 lugares.
- **Por que não usar um texto "Salvando..." no lugar do spinner**: trocar o texto do botão
  exigiria um prop de label alternativo (ou duplicar a lógica de children) em cada um dos ~20
  chamadores, e em botões com texto maior isso faz o botão "pular" de largura. Manter o texto
  original e só acrescentar o ícone giratório antes dele é mais simples de aplicar em massa e não
  altera a largura/layout.
- **Enter no login**: como descrito em "Objetivo", a investigação no código mostra que isso já
  funciona (formulário real + botão `type='submit'`). Risco baixo de estar errado, mas será
  confirmado manualmente na QA antes de marcar esse ponto como atendido — se o comportamento real
  divergir da leitura do código, o plano será reaberto pra investigar a causa real antes de
  qualquer `onKeyDown` manual (que seria redundante e poderia mascarar outro problema, ex.: um
  botão desabilitado por engano antes mesmo do clique).
