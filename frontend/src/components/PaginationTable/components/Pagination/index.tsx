import { Button } from "@/components/ui/button";
import type { PaginationProps } from "./models";

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const getPages = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };

  const pages = getPages();

  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='outline'
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className='h-8 w-8'
      >
        {"<"}
      </Button>

      {pages.map((page, index) =>
        page === "..." ? (
          <span key={`dots-${index}`} className='px-2 text-muted-foreground'>
            ...
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            onClick={() => typeof page === "number" && onPageChange(page)}
            className='h-8 w-8'
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant='outline'
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className='h-8 w-8'
      >
        {">"}
      </Button>
    </div>
  );
}
