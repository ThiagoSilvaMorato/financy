import logo from "@/assets/logo.svg";
import { CustomInput } from "@/components/CustomInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { KeyRound, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router";
import { Controller, useForm, type Resolver } from "react-hook-form";
import type { ResetPasswordForm } from "./models";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { apolloClient } from "@/lib/graphql/apollo";
import { RESET_PASSWORD } from "@/lib/graphql/mutation/ResetPassword";
import { toast } from "sonner";

const validationSchema = yup.object().shape({
  email: yup.string().trim().required("E-mail é obrigatório").email("E-mail inválido"),
  code: yup.string().trim().required("Código é obrigatório"),
  password: yup
    .string()
    .trim()
    .required("Senha é obrigatória")
    .min(8, "A senha deve ter pelo menos 8 caracteres"),
  confirmPassword: yup
    .string()
    .trim()
    .oneOf([yup.ref("password")], "As senhas devem coincidir")
    .required("Confirmação de senha é obrigatória"),
});

export const ResetPassword = () => {
  const location = useLocation();
  const emailFromState = location.state?.email;
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    defaultValues: {
      email: emailFromState || "",
      code: "",
      password: "",
      confirmPassword: "",
    },
    resolver: yupResolver(validationSchema) as Resolver<ResetPasswordForm>,
  });

  const navigate = useNavigate();

  const handleFormSubmit = async (data: ResetPasswordForm) => {
    setLoading(true);

    try {
      const resetPasswordMutate = await apolloClient.mutate({
        mutation: RESET_PASSWORD,
        variables: {
          data,
        },
      });

      if (resetPasswordMutate) {
        toast.success("Senha redefinida com sucesso!");
        navigate("/");
      }
    } catch {
      toast.error("Erro ao redefinir senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col min-h-[calc(100vh-4rem)] items-center justify-center gap-6'>
      <img src={logo} alt='Logo da aplicação' className='w-40 h-22' />
      <Card className='w-full max-w-md rounded-xl'>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl font-bold font-mono'>Redefinir senha</CardTitle>
          <CardDescription>Informe o código recebido no e-mail e sua nova senha</CardDescription>
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
              name='code'
              control={control}
              render={({ field }) => (
                <CustomInput
                  id='code'
                  type='text'
                  label='Código de recuperação'
                  placeholder='Digite o código recebido por e-mail'
                  icon={<KeyRound size={20} />}
                  error={errors.code?.message}
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
            <Controller
              name='confirmPassword'
              control={control}
              render={({ field }) => (
                <CustomInput
                  id='confirmPassword'
                  type='password'
                  label='Confirmar Senha'
                  placeholder='Confirme a nova senha'
                  icon={<Lock size={20} />}
                  error={errors.confirmPassword?.message}
                  {...field}
                />
              )}
            />

            <div className='pt-3'>
              <Button type='submit' className='w-full h-[48px]' disabled={loading}>
                Redefinir senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
