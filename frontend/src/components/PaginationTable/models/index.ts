import type { Dispatch, ReactNode, SetStateAction } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataObject = Record<string, any>;

export interface PaginationTableProps<T extends DataObject> {
  tableColumns: TableColumns<T>[];
  data: T[];
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
}

interface TableColumns<T extends DataObject> {
  accessorKey: string;
  header: string;
  align: string;
  render?: (data: T) => ReactNode;
}
