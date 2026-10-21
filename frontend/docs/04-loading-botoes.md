# Loading e desabilitação de botões durante chamadas de API

**Data:** 2026-10-20
**Plano:** [04-FRONTEND-loading-botoes](../../docs/plans/04-FRONTEND-loading-botoes.md)

## O que foi feito

- Novo prop `loading?: boolean` no `Button` (`src/components/ui/button.tsx`): quando `true`,
  desenha um ícone `Loader2` (lucide-react, `animate-spin`) antes do conteúdo, mescla no
  `disabled` nativo (`disabled || loading`) e seta `aria-busy`.
- Duas hooks novas em `src/hooks/` (pasta nova no projeto):
  - `useAsyncAction` — `{ loading, run }`, pra botões de ação única (modais de confirmação,
    "Definir como padrão", `InviteCodeCard`, as duas ações de `Profile`).
  - `usePendingKeys` — `{ isPending, run }`, backed por um `Set<string>` de chaves pendentes, pra
    listas onde itens diferentes podem ter ações pendentes ao mesmo tempo (`ParticipantsList`,
    `MembersList`, `PendingMembersList`).
- `formState.isSubmitting` do React Hook Form ligado em todo botão de submit dos formulários já
  existentes (Login, Signup, RecoverPassword, ResetPassword, NewCategoryModal,
  TransactionFormModal, CreateParticipantModal, RenameEnvironmentModal, CreateEnvironmentModal,
  JoinByCodeModal no passo de preview) — sem usar as hooks novas, já que RHF fornece isso de graça.
- Os dois hooks novos ligados nos ~11 componentes com `onClick` direto.
- Correções colaterais nos arquivos tocados: `Profile` tinha um `loading` compartilhado entre
  "Salvar Alterações" e "Sair da conta" — agora são duas instâncias independentes de
  `useAsyncAction`; o catch do logout trocou um `console.error` sem o erro real por
  `toast.error(...)`; `EnvironmentManagementHeader.onSetDefault` teve o tipo corrigido de
  `() => void` pra `() => Promise<void> | void` (a função real já era `async`); 3 botões que já
  tinham ícone próprio (Profile "Sair da conta", "Definir como padrão", InviteCodeCard "Gerar
  código de convite") escondem esse ícone enquanto `loading`, pra não mostrar dois ícones ao mesmo
  tempo; `MembersList`'s `disabled={blocksLastAdmin}` foi preservado e somado (não substituído)
  à nova condição de loading.

## Por que foi feito

Nenhum botão do app mostrava indicador visual de carregamento — alguns desabilitavam via um
`useState` manual (sem spinner), a maioria não tinha tratamento nenhum. Também foi pedido Enter no
login disparar o submit — já funcionava (formulário real + botão `type='submit'`), confirmado
durante o planejamento sem necessidade de código novo.

## Por que esse caminho foi escolhido

- **Dois hooks em vez de um genérico**: um hook único cobrindo os dois formatos (alvo fixo vs.
  lista) exigiria uma chave artificial nos casos sem lista. Separar em `useAsyncAction`/
  `usePendingKeys` manteve a assinatura mínima em cada caso.
- **`Set<string>` em vez de um valor único pendente**: um valor único (booleano, id isolado, ou
  `{id, ação}` isolado) quebra quando duas ações em itens diferentes da lista ficam pendentes ao
  mesmo tempo — o clique mais recente sobrescreveria o estado do anterior. Um `Set` suporta
  qualquer número de chaves pendentes sem uma apagar a outra.
- **`formState.isSubmitting` em vez de reaproveitar `useAsyncAction` nos formulários RHF**: seria
  um segundo estado controlando a mesma coisa que o React Hook Form já fornece de graça.
- **Extensão do `Button` em vez de um `LoadingButton` novo**: evita duplicar toda a lógica de
  variantes/tamanhos já existente, e o pedido cobre essencialmente todo botão de API do app.
