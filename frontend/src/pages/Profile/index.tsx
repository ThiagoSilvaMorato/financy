import { CustomInput } from "@/components/CustomInput";
import Divider from "@/components/Divider";
import { Page } from "@/components/Page";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";
import { LogOut, Mail, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export const Profile = () => {
  const { user, logout } = useAuthStore();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // TODO: implement update user info
  const updateUser = () => {
    console.log({ name, email });
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await logout();

      console.log(response);

      navigate("/login");
    } catch {
      console.error("Erro ao sair da conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <div className='flex justify-center items-center'>
        <Card className='w-full max-w-md rounded-xl'>
          <CardHeader className='items-center gap-2'>
            <Avatar style={{ width: 80, height: 80 }}>
              <AvatarFallback className='bg-gray-300 text-2xl font-medium'>
                {user?.name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n.charAt(0).toUpperCase())
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <h2 className='text-2xl font-bold mt-4'>{user?.name}</h2>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <div className='w-[90%] mx-auto mt-4 mb-8'>
            <Divider />
          </div>
          <CardContent>
            <div className='space-y-4'>
              <CustomInput
                label='Nome Completo'
                id='name'
                value={name}
                setValue={setName}
                icon={<User />}
                placeholder='Seu nome completo'
              />
              <CustomInput
                label='E-mail'
                id='email'
                value={email}
                setValue={setEmail}
                icon={<Mail />}
                disabled
                helperText='O e-mail não pode ser alterado'
              />
            </div>

            <div className='mt-10'>
              <Button className='w-full h-12' onClick={updateUser} disabled={loading}>
                Salvar Alterações
              </Button>
              <Button
                variant='outline'
                className='w-full mt-3 h-12'
                onClick={handleLogout}
                disabled={loading}
              >
                <LogOut className='text-red-400' />
                Sair da conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};
