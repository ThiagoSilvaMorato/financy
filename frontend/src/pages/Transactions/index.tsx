import { Page } from "@/components/Page";
import { TransactionHeader } from "./components/TransactionHeader";
import { Filter } from "./components/Filter";
import { PaginationTable } from "@/components/PaginationTable";
import { Card, CardContent } from "@/components/ui/card";
import { tableColumns } from "./utils/tableColumns";
import { useState } from "react";

export const Transactions = () => {
  const [page, setPage] = useState(1);
  const tableRows = [
    {
      id: "1",
      description: "Salário Mensal",
      date: "01/06/2024",
      category: {
        id: "1",
        title: "Receita",
        description: "Todas as receitas",
        icon: "Wallet",
        color: "green",
      },
      type: "income",
      amount: 5000,
    },
    {
      id: "2",
      description: "Aluguel",
      date: "05/06/2024",
      category: {
        id: "2",
        title: "Despesas Fixas",
        description: "Despesas mensais fixas",
        icon: "Home",
        color: "red",
      },
      type: "expense",
      amount: 1200,
    },
    {
      id: "3",
      description: "Compra de Supermercado",
      date: "10/06/2024",
      category: {
        id: "3",
        title: "Alimentação",
        description: "Despesas com alimentação",
        icon: "ShoppingCart",
        color: "blue",
      },
      type: "expense",
      amount: 300,
    },
    {
      id: "4",
      description: "Freelance Projeto Web",
      date: "15/06/2024",
      category: {
        id: "4",
        title: "Trabalho Freelance",
        description: "Renda extra de trabalhos freelance",
        icon: "Laptop",
        color: "purple",
      },
      type: "income",
      amount: 800,
    },
    {
      id: "5",
      description: "Conta de Luz",
      date: "20/06/2024",
      category: {
        id: "5",
        title: "Despesas de Utilidades",
        description: "Contas mensais de utilidades",
        icon: "Zap",
        color: "yellow",
      },
      type: "expense",
      amount: 150,
    },
    {
      id: "6",
      description: "Venda de Itens Usados",
      date: "25/06/2024",
      category: {
        id: "6",
        title: "Renda Extra",
        description: "Renda de vendas ocasionais",
        icon: "Package",
        color: "orange",
      },
      type: "income",
      amount: 200,
    },
    {
      id: "7",
      description: "Jantar Fora",
      date: "28/06/2024",
      category: {
        id: "7",
        title: "Lazer",
        description: "Despesas com entretenimento e lazer",
        icon: "Coffee",
        color: "pink",
      },
      type: "expense",
      amount: 80,
    },
    {
      id: "8",
      description: "Bônus Anual",
      date: "30/06/2024",
      category: {
        id: "8",
        title: "Receita Extra",
        description: "Bônus e receitas extras anuais",
        icon: "Gift",
        color: "teal",
      },
      type: "income",
      amount: 1500,
    },
    {
      id: "9",
      description: "Transporte Público",
      date: "02/07/2024",
      category: {
        id: "9",
        title: "Transporte",
        description: "Despesas com transporte diário",
        icon: "Bus",
        color: "cyan",
      },
      type: "expense",
      amount: 100,
    },
    {
      id: "10",
      description: "Venda de Artesanato",
      date: "05/07/2024",
      category: {
        id: "10",
        title: "Renda Criativa",
        description: "Renda de vendas de artesanato",
        icon: "Scissors",
        color: "lime",
      },
      type: "income",
      amount: 250,
    },
    {
      id: "11",
      description: "Assinatura de Streaming",
      date: "08/07/2024",
      category: {
        id: "11",
        title: "Entretenimento",
        description: "Despesas com serviços de streaming",
        icon: "Film",
        color: "indigo",
      },
      type: "expense",
      amount: 40,
    },
  ];
  // const tableRows = [] as TransactionModel[];

  return (
    <Page>
      <div className='space-y-6'>
        <TransactionHeader />
        <Filter />
        <Card>
          <CardContent>
            <div className='pt-4'>
              <PaginationTable
                page={page}
                setPage={setPage}
                tableColumns={tableColumns()}
                data={tableRows}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};
