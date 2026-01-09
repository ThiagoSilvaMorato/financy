import { Page } from "@/components/Page";
import { TransactionHeader } from "./components/TransactionHeader";
import { Filter } from "./components/Filter";
import { PaginationTable } from "@/components/PaginationTable";
import { Card, CardContent } from "@/components/ui/card";
import { tableColumns } from "./utils/tableColumns";
import { useEffect, useState } from "react";
import { apolloClient } from "@/lib/graphql/apollo";
import { GET_TRANSACTION } from "@/lib/graphql/queries/GetTransactions";
import type { TransactionModel } from "./models";

interface GetTransactionQueryData {
  listTransactions: TransactionModel[];
}

export const Transactions = () => {
  const [page, setPage] = useState(1);
  const [tableData, setTableData] = useState<TransactionModel[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data } = await apolloClient.query<GetTransactionQueryData>({
        query: GET_TRANSACTION,
        fetchPolicy: "no-cache",
      });
      setTableData(data?.listTransactions || []);
      console.log("Fetched transactions:", data?.listTransactions);
    }

    fetchData();
  }, []);

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
                data={tableData}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};
