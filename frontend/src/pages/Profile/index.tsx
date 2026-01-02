import { CustomInput } from "@/components/CustomInput";
import Divider from "@/components/Divider";
import { Page } from "@/components/Page";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { apolloClient } from "@/lib/graphql/apollo";
import { USER } from "@/lib/graphql/mutation/User";
import { useAuthStore } from "@/stores/auth";
import type { UpdateUserInput } from "@/types";
import { LogOut, Mail, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type UpdateUserMutationData = {
  updateUser: {
    name: string;
    email: string;
  };
};

export const Profile = () => {
  const { user, logout, updateUser: updateAuthUser } = useAuthStore();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleUpdateUser = async () => {
    try {
      const { data } = await apolloClient.mutate<UpdateUserMutationData, { data: UpdateUserInput }>(
        {
          mutation: USER,
          variables: {
            data: {
              name,
              email,
            },
          },
        }
      );

      if (data?.updateUser) {
        updateAuthUser({ name, email });
        toast.success("Usuário atualizado com sucesso!");
      }
    } catch {
      toast.error("Erro ao atualizar usuário.");
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();

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
              <Button className='w-full h-12' onClick={handleUpdateUser} disabled={loading}>
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
