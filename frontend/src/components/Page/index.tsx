import type { ReactNode } from "react";

interface IPageProps {
  children: ReactNode;
}

export const Page = ({ children }: IPageProps) => {
  return <div className='min-h-[calc(100vh-9rem)] rounded-xl pt-8'>{children}</div>;
};
