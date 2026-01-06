import { Toaster } from "@/components/ui/sonner";
import type { ILayoutProps } from "./models";
import { Header } from "../Header";

export const Layout = ({ children, isAuthenticated }: ILayoutProps) => {
  return (
    <div className='min-h-screen bg-gray-200'>
      {isAuthenticated && <Header />}
      <main className='mx-auto px-16 py-4'>
        {children}
        <Toaster />
      </main>
    </div>
  );
};
