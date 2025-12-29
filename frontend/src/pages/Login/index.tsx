import logo from "@/assets/logo.svg";
import { CustomInput } from "@/components/CustomInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Lock, Mail, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomCheckbox } from "@/components/CustomCheckbox";
import Divider from "@/components/Divider";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const loginMutate = await login({ email, password });

      if (loginMutate) {
        toast.success("Login realizado com sucesso!");
        // navigate("/");
      }
    } catch {
      toast.error("Erro ao fazer login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col min-h-[calc(100vh-4rem)] items-center justify-center gap-6'>
      <img src={logo} alt='Logo da aplicação' className='w-40 h-22' />
      <Card className='w-full max-w-md rounded-xl'>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl font-bold font-mono'>Fazer login</CardTitle>
          <CardDescription>Entre na sua conta para continuar</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <CustomInput
              id='email'
              type='email'
              label='E-mail'
              value={email}
              setValue={setEmail}
              placeholder='mail@exemplo.com'
              icon={<Mail size={20} />}
              required
            />
            <CustomInput
              id='password'
              type='password'
              label='Senha'
              value={password}
              setValue={setPassword}
              placeholder='Digite sua senha'
              icon={<Lock size={20} />}
              required
            />

            <div className='flex items-center justify-between pb-3'>
              <CustomCheckbox id='remember' label='Lembrar-me' />
              <span
                className='text-primary underline hover:cursor-pointer hover:brightness-125'
                onClick={() => console.log("Recuperar senha")}
              >
                Recuperar senha
              </span>
            </div>

            <Button type='submit' className='w-full mt-4 h-[48px]' disabled={loading}>
              Entrar
            </Button>
          </form>

          <Divider text='ou' className='my-8' />

          <CardDescription className='text-center'>Ainda não tem uma conta?</CardDescription>

          <Button
            variant='outline'
            className='w-full mt-4 h-[48px]'
            onClick={() => navigate("/signup")}
          >
            <UserRoundPlus size={20} className='mr-2' />
            Criar conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
