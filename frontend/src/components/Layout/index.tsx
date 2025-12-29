import { Toaster } from "@/components/ui/sonner";
import type { ILayoutProps } from "./models";

export const Layout = ({ children }: ILayoutProps) => {
  return (
    <div className='min-h-screen bg-gray-200'>
      <main className='mx-auto px-16 py-4'>
        {children}
        <Toaster />
      </main>
    </div>
  );
};
