# QA — ponto de partida

## Conta fixa para testes manuais / via browser

Pra qualquer teste **manual ou guiado por browser** (ex.: um agente navegando a UI de verdade
pra validar uma feature visualmente), **sempre reaproveite esta conta** — nunca registre uma
conta nova só pra isso:

```
E-mail:  qa-thiago@teste.local
Senha:   qathiago123
```

- **Ambiente pessoal dela, "QA TESTE THIAGO"**, é o lugar seguro pra criar/editar/excluir dados de
  teste (transações, categorias, parcelamentos, etc.) sem risco de misturar com dado real.
- Essa conta também é membro de **"Pereira Morato"**, o ambiente conjunto real do dono do
  projeto (com dados financeiros reais) — **nunca crie/edite/exclua dados de teste ali**. Se um
  teste precisar de um ambiente conjunto (múltiplos membros, convite, etc.), crie um ambiente novo
  a partir desta mesma conta em vez de usar o "Pereira Morato".
- Se o teste precisar de uma **segunda** conta (ex.: testar convite/aceite entre duas pessoas),
  aí sim é aceitável registrar uma conta nova — mas use o padrão já estabelecido
  (`qa-<timestamp>-x@test.local`, nome com prefixo `[QA]`) pra ela ficar reconhecível e capturável
  pela limpeza em massa depois.

Essa regra vale pra sessões manuais/interativas. Os **scripts automatizados** de QA
(`backend/scripts/qa-*.ts`) continuam no padrão próprio deles — criam usuários descartáveis
com timestamp a cada rodada e não precisam mudar por causa desta convenção (são rápidos,
isolados, e já pensados pra serem rodados repetidamente).

## Limpeza em massa

Antes de ir pra produção (ou sempre que quiser o banco de dev limpo de dados de teste):

```bash
cd backend
npx tsx scripts/qa-cleanup-all.ts            # dry-run — mostra o que seria apagado
npx tsx scripts/qa-cleanup-all.ts --apply    # apaga de verdade
```

Nunca apaga `qa-thiago@teste.local` (não bate no padrão de e-mail do script) nem o ambiente "QA
TESTE THIAGO" (não bate no padrão de nome) — é intencional, essa conta é fixa, não descartável.

## Relatórios de QA por tarefa

Ver `NN-QA-BACK-*.md`/`NN-QA-FRONT-*.md` neste diretório — um por tarefa, linkado do plano
aprovado correspondente em `docs/plans/`.
