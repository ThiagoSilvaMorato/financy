import { useAuthStore } from "@/stores/auth";
import { Navigation } from "./components/Navigation";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useNavigate } from "react-router";
export const Header = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className='w-full px-16 py-4 bg-white flex items-center border-b border-gray-300'>
      {isAuthenticated && (
        <div className='flex justify-between w-full'>
          <div className='min-w-48'>
            <img src='/Logo.svg' alt='Financy' className='h-8' />
          </div>
          <Navigation />
          <div className='flex items-center gap-2'>
            <Avatar
              className='cursor-pointer hover:brightness-110 transition-all'
              onClick={() => navigate("/profile")}
            >
              <AvatarFallback className='bg-gray-300 tedt-primary-foreground'>
                {user?.name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n.charAt(0).toUpperCase())
                  .join("")}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      )}
    </header>
  );
};
