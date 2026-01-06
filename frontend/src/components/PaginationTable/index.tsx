import Divider from "../Divider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Pagination } from "./components/Pagination";
import type { DataObject, PaginationTableProps } from "./models";

export const PaginationTable = <T extends DataObject>({
  tableColumns,
  data = [],
  page,
  setPage,
}: PaginationTableProps<T>) => {
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {tableColumns.map((column) => (
              <TableHead key={column.accessorKey}>
                <div
                  className={`${
                    column.align === "center"
                      ? "text-center"
                      : column.align === "right"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {column.header}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length <= 0 ? (
            <TableRow>
              <TableCell colSpan={tableColumns.length} className='text-center py-4'>
                Nenhum dado disponível.
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row, index) => (
              <TableRow key={row.id ?? startIndex + index}>
                {tableColumns.map((column) => (
                  <TableCell key={column.accessorKey}>
                    <div
                      className={`${
                        column.align === "center"
                          ? "text-center"
                          : column.align === "right"
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {column.render ? column.render(row) : row[column.accessorKey]}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <Divider />
      {data.length > 0 && (
        <div className='flex justify-between items-center mt-4'>
          <div>
            <span className='text-sm text-gray-500'>
              {`${startIndex + 1} a ${Math.min(startIndex + paginatedData.length, data.length)} | ${
                data.length
              } resultados`}
            </span>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </>
  );
};
