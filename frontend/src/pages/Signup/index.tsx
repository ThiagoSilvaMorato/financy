import logo from "@/assets/logo.svg";
import { CustomInput } from "@/components/CustomInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Lock, LogIn, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Divider from "@/components/Divider";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";

export const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const signupMutate = await signup({ name, email, password });

      if (signupMutate) {
        toast.success("Cadastro realizado com sucesso!");
      }
    } catch {
      toast.error("Erro ao cadastrar usuário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col min-h-[calc(100vh-4rem)] items-center justify-center gap-6'>
      <img src={logo} alt='Logo da aplicação' className='w-40 h-22' />
      <Card className='w-full max-w-md rounded-xl'>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl font-bold font-mono'>Criar conta</CardTitle>
          <CardDescription>Comece a controlar suas finanças ainda hoje</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <CustomInput
              id='name'
              type='name'
              label='Nome completo'
              value={name}
              setValue={setName}
              placeholder='mail@exemplo.com'
              icon={<User size={20} />}
              required
            />
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
              helperText='A senha deve ter no mínimo 8 caracteres'
              required
            />

            <div className='pt-3'>
              <Button type='submit' className='w-full h-[48px]' disabled={loading}>
                Cadastrar
              </Button>
            </div>
          </form>

          <Divider text='ou' className='my-8' />

          <CardDescription className='text-center'>Já tem uma conta?</CardDescription>

          <Button
            variant='outline'
            className='w-full mt-4 h-[48px]'
            onClick={() => navigate("/login")}
          >
            <LogIn size={20} className='mr-2' />
            Fazer login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
