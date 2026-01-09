import logo from "@/assets/logo.svg";
import { CustomInput } from "@/components/CustomInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Divider from "@/components/Divider";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { RECOVER_PASSWORD } from "@/lib/graphql/mutation/RecoverPassword";
import { apolloClient } from "@/lib/graphql/apollo";
import * as yup from "yup";
import { Controller, useForm, type Resolver } from "react-hook-form";
import type { RecoverPasswordForm } from "./models";
import { yupResolver } from "@hookform/resolvers/yup";

const validationSchema = yup.object().shape({
  email: yup.string().trim().required("E-mail é obrigatório").email("E-mail inválido"),
});

export const RecoverPassword = () => {
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoverPasswordForm>({
    defaultValues: {
      email: "",
    },
    resolver: yupResolver(validationSchema) as Resolver<RecoverPasswordForm>,
  });

  const handleFormSubmit = async (data: RecoverPasswordForm) => {
    setLoading(true);

    try {
      const recoverPassworMutate = await apolloClient.mutate({
        mutation: RECOVER_PASSWORD,
        variables: {
          data,
        },
      });

      if (recoverPassworMutate) {
        toast.success("Código de recuperação enviado para seu e-mail!");
        navigate("/reset-password", { state: { email: data.email } });
      }
    } catch {
      toast.error("Erro ao enviar o código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col min-h-[calc(100vh-4rem)] items-center justify-center gap-6'>
      <img src={logo} alt='Logo da aplicação' className='w-40 h-22' />
      <Card className='w-full max-w-md rounded-xl'>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl font-bold font-mono'>Recuperar senha</CardTitle>
          <CardDescription>
            Informe seu e-mail para receber um código de recuperação
          </CardDescription>
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

            <Button type='submit' className='w-full mt-4 h-[48px]' disabled={loading}>
              Enviar código
            </Button>
          </form>

          <Divider text='ou' className='my-8' />

          <CardDescription className='text-center'>Lembrou a senha?</CardDescription>

          <Button
            variant='outline'
            className='w-full mt-4 h-[48px]'
            onClick={() => navigate("/login")}
            disabled={loading}
          >
            <LogIn size={20} className='mr-2' />
            Fazer login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
