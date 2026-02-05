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
import * as yup from "yup";
import { Controller, useForm, type Resolver } from "react-hook-form";
import type { SignupForm } from "./models";
import { yupResolver } from "@hookform/resolvers/yup";

const validationSchema = yup.object().shape({
  name: yup.string().trim().required("Nome é obrigatório"),
  email: yup.string().trim().required("E-mail é obrigatório").email("E-mail inválido"),
  password: yup
    .string()
    .trim()
    .required("Senha é obrigatória")
    .min(8, "A senha deve ter pelo menos 8 caracteres"),
});

export const Signup = () => {
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    resolver: yupResolver(validationSchema) as Resolver<SignupForm>,
  });

  const handleFormSubmit = async (data: SignupForm) => {
    setLoading(true);

    try {
      const signupMutate = await signup(data);

      if (signupMutate) {
        toast.success("Cadastro realizado com sucesso!");
        navigate("/");
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
          <form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-4'>
            <Controller
              control={control}
              name='name'
              render={({ field }) => (
                <CustomInput
                  id='name'
                  type='name'
                  label='Nome completo'
                  placeholder='Seu nome completo'
                  icon={<User size={20} />}
                  error={errors.name?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name='email'
              control={control}
              render={({ field }) => (
                <CustomInput
                  id='email'
                  type='text'
                  label='E-mail'
                  placeholder='mail@example.com'
                  icon={<Mail size={20} />}
                  error={errors.email?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name='password'
              control={control}
              render={({ field }) => (
                <CustomInput
                  id='password'
                  type='password'
                  label='Senha'
                  placeholder='Digite a nova senha'
                  icon={<Lock size={20} />}
                  error={errors.password?.message}
                  {...field}
                />
              )}
            />

            <div className='pt-3'>
              <Button type='submit' className='w-full h-[48px]' disabled={loading}>
                Cadastrar
              </Button>
            </div>
          </form>

          <Divider text='ou' className='my-8' />

          <CardDescription className='text-center'>Já tem uma conta?</CardDescription>

          <Button variant='outline' className='w-full mt-4 h-[48px]' onClick={() => navigate("/")}>
            <LogIn size={20} className='mr-2' />
            Fazer login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
