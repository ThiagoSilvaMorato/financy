import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomInput } from "@/components/CustomInput";
import { CustomSelect } from "@/components/CustomSelect";
import { Controller, useForm, type Resolver } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { environmentManagementService } from "../../services";
import type { InviteMemberForm as InviteMemberFormModel } from "../../models";

const roleOptions = [
  { label: "Membro", value: "user" },
  { label: "Admin", value: "admin" },
];

const validationSchema = yup.object().shape({
  email: yup.string().trim().required("E-mail é obrigatório").email("E-mail inválido"),
  role: yup.string().oneOf(["admin", "user"]).required("Papel é obrigatório"),
});

interface InviteMemberFormProps {
  environmentId: string;
  onInvited: () => Promise<void>;
}

export const InviteMemberForm = ({ environmentId, onInvited }: InviteMemberFormProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteMemberFormModel>({
    defaultValues: { email: "", role: "user" },
    resolver: yupResolver(validationSchema) as Resolver<InviteMemberFormModel>,
  });

  const handleFormSubmit = async (formData: InviteMemberFormModel) => {
    try {
      const { data } = await environmentManagementService.inviteMember(environmentId, formData);

      if (data?.inviteMember) {
        toast.success("Convite enviado com sucesso!");
        reset();
        await onInvited();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar convite.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convidar membro</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className='flex items-start gap-3'>
          <div className='flex-1'>
            <Controller
              name='email'
              control={control}
              render={({ field }) => (
                <CustomInput
                  id='invite-email'
                  type='text'
                  label='E-mail'
                  placeholder='mail@example.com'
                  error={errors.email?.message}
                  {...field}
                />
              )}
            />
          </div>
          <div className='w-40'>
            <Controller
              name='role'
              control={control}
              render={({ field }) => (
                <CustomSelect
                  label='Papel'
                  placeholder='Selecione'
                  options={roleOptions}
                  value={field.value}
                  onSelect={(value) => field.onChange(value)}
                  error={errors.role?.message}
                />
              )}
            />
          </div>
          <Button type='submit' className='h-12 mt-6'>
            Convidar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
