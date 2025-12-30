import { Link, useLocation } from "react-router-dom";

export const Navigation = () => {
  const location = useLocation();
  const isDashboardPage = location.pathname === "/";
  const isTransactionsPage = location.pathname === "/transactions";
  const isCategoriesPage = location.pathname === "/categories";

  const commonClasses = "text-sm font-medium cursor-pointer";

  return (
    <div className='flex items-center gap-4'>
      <Link to='/'>
        <span
          className={`${commonClasses} ${
            isDashboardPage ? "text-primary !text-base" : "text-gray-500"
          }`}
        >
          Dashboard
        </span>
      </Link>
      <Link to='/transactions'>
        <span
          className={`${commonClasses} ${
            isTransactionsPage ? "text-primary !text-base" : "text-gray-500"
          }`}
        >
          Transações
        </span>
      </Link>
      <Link to='/categories'>
        <span
          className={`${commonClasses} ${
            isCategoriesPage ? "text-primary !text-base" : "text-gray-500"
          }`}
        >
          Categorias
        </span>
      </Link>
    </div>
  );
};
