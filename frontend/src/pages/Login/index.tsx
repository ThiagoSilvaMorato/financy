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
import * as yup from "yup";
import { Controller, useForm, type Resolver } from "react-hook-form";
import type { LoginForm } from "./models";
import { yupResolver } from "@hookform/resolvers/yup";

const validationSchema = yup.object().shape({
  email: yup.string().trim().required("E-mail é obrigatório").email("E-mail inválido"),
  password: yup.string().trim().required("Senha é obrigatória"),
  rememberMe: yup.boolean(),
});

export const Login = () => {
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    resolver: yupResolver(validationSchema) as Resolver<LoginForm>,
  });

  const handleFormSubmit = async (data: LoginForm) => {
    setLoading(true);

    try {
      const loginMutate = await login(data);

      if (loginMutate) {
        toast.success("Login realizado com sucesso!");
        navigate("/");
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
          <form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-4'>
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

            <div className='flex items-center justify-between pb-3'>
              <Controller
                control={control}
                name='rememberMe'
                render={({ field }) => (
                  <CustomCheckbox
                    id='remember'
                    label='Lembrar-me'
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <span
                className='text-primary underline hover:cursor-pointer hover:brightness-125'
                onClick={() => navigate("/recover-password")}
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
