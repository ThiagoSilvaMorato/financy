/* eslint-disable @typescript-eslint/no-unused-expressions */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Controller, useForm, type Resolver } from "react-hook-form";
import type { NewTransactionForm, TransactionFormModalProps } from "./models";
import { TypeSelector } from "./components/TypeSelector";
import { CustomInput } from "@/components/CustomInput";
import { formatCurrency } from "@/utils/formatCurrency";
import { DatePicker } from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/CustomSelect";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { transactionService } from "../../pages/Transactions/services";
import { useEffect, useMemo } from "react";
import { useEnvironmentStore } from "@/stores/environment";
import { useAuthStore } from "@/stores/auth";
import { getMyEnvironmentMember } from "@/utils/getMyEnvironmentMember";

const validationSchema = yup.object().shape({
  type: yup.string().oneOf(["income", "expense"]).required("Tipo é obrigatório"),
  description: yup.string().trim().required("Descrição é obrigatória"),
  date: yup.date().nullable().required("Data é obrigatória"),
  amount: yup.string().trim().required("Valor é obrigatório"),
  categoryId: yup
    .string()
    .trim()
    .required("Categoria é obrigatória")
    .notOneOf(["select"], "Categoria é obrigatória"),
  memberId: yup
    .string()
    .trim()
    .required("Selecione a quem atribuir")
    .notOneOf(["select"], "Selecione a quem atribuir"),
});

export const TransactionFormModal = ({
  isOpen,
  setIsOpen,
  categories,
  isEdit = false,
  setIsEdit,
  transactionInfo,
  setTransactionInfo,
  fetchData,
}: TransactionFormModalProps) => {
  const user = useAuthStore((state) => state.user);
  const { environments, currentEnvironmentId } = useEnvironmentStore();

  const currentEnvironment = useMemo(
    () => environments.find((environment) => environment.id === currentEnvironmentId),
    [environments, currentEnvironmentId]
  );

  const memberOptions = useMemo(
    () => [
      { label: "Selecione", value: "select", disabled: true },
      ...(currentEnvironment?.members ?? [])
        .filter((member) => !member.removedAt)
        .map((member) => ({
          label: member.user ? member.user.name : member.displayName ?? "Participante",
          value: member.id,
        })),
    ],
    [currentEnvironment]
  );

  const myMemberId = useMemo(
    () => getMyEnvironmentMember(currentEnvironment, user?.id)?.id,
    [currentEnvironment, user?.id]
  );

  const categoryOptions = [
    { label: "Selecione a categoria", value: "select", disabled: true },
    ...(Array.isArray(categories) ? categories : []),
  ];

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<NewTransactionForm>({
    defaultValues: {
      type: "expense",
      description: "",
      date: undefined,
      amount: "",
      categoryId: "",
      memberId: "",
    },
    resolver: yupResolver(validationSchema) as Resolver<NewTransactionForm>,
  });

  const handleFormSubmit = async (formData: NewTransactionForm) => {
    if (isEdit && !transactionInfo) {
      toast.error("Informações da transação para edição estão ausentes. Tente novamente.");
      return;
    }

    const payload = {
      ...formData,
    };

    if (isEdit) {
      try {
        const { data } = await transactionService.updateTransaction({
          id: transactionInfo!.id!,
          ...payload,
        });

        if (data?.updateTransaction) {
          toast.success("Transação atualizada com sucesso!");
          reset();
          setIsOpen(false);
          setIsEdit && setIsEdit(false);
          setTransactionInfo && setTransactionInfo(null);

          if (fetchData) {
            await fetchData();
          }
        }
      } catch {
        toast.error("Erro ao editar a transação.");
      }
    } else {
      try {
        const { data } = await transactionService.createTransaction(payload);

        if (data?.createTransaction) {
          toast.success("Transação criada com sucesso!");
          setIsOpen(false);
          reset();

          if (fetchData) await fetchData();
        }
      } catch {
        toast.error("Erro ao criar nova transação.");
      }
    }
  };

  const handleOpenChange = () => {
    setIsOpen(!isOpen);
    reset();
    setIsEdit && setIsEdit(false);
    setTransactionInfo && setTransactionInfo(null);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && transactionInfo) {
      setValue("type", transactionInfo.type);
      setValue("description", transactionInfo.description);
      setValue("date", new Date(transactionInfo.date));
      setValue("amount", formatCurrency(transactionInfo.amount));
      setValue("categoryId", transactionInfo.category.id);
      setValue("memberId", transactionInfo.memberId);
    } else if (myMemberId) {
      setValue("memberId", myMemberId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, myMemberId]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
            <DialogDescription>Registre sua despesa ou receita</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 mt-6'>
            <Controller
              control={control}
              name='type'
              render={({ field }) => <TypeSelector value={field.value} setValue={setValue} />}
            />
            <Controller
              control={control}
              name='description'
              render={({ field }) => (
                <CustomInput
                  id='description'
                  type='text'
                  label='Descrição'
                  placeholder='Descrição da transação'
                  error={errors.description?.message}
                  {...field}
                />
              )}
            />
            <div className='grid grid-cols-2 items-start gap-2'>
              <Controller
                control={control}
                name='date'
                render={({ field }) => (
                  <DatePicker
                    id='date'
                    label='Data'
                    placeholder='Selecione'
                    error={errors.date?.message}
                    value={field.value ?? null}
                    onChange={(d) => field.onChange(d)}
                  />
                )}
              />
              <Controller
                control={control}
                name='amount'
                render={({ field }) => (
                  <CustomInput
                    id='amount'
                    type='text'
                    label='Valor'
                    prefix='R$'
                    placeholder='0.00'
                    error={errors.amount?.message}
                    {...field}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, "");
                      const numericValueAsNumber = parseFloat(numericValue) / 100;

                      field.onChange(formatCurrency(numericValueAsNumber));
                    }}
                  />
                )}
              />
            </div>
            <Controller
              control={control}
              name='categoryId'
              render={({ field }) => (
                <CustomSelect
                  label='Categoria'
                  placeholder='Selecione a categoria'
                  options={categoryOptions}
                  value={field.value ?? "select"}
                  onSelect={(value) => field.onChange(value)}
                  error={errors.categoryId?.message}
                />
              )}
            />
            <Controller
              control={control}
              name='memberId'
              render={({ field }) => (
                <CustomSelect
                  label='De quem é essa transação'
                  placeholder='Selecione'
                  options={memberOptions}
                  value={field.value ?? "select"}
                  onSelect={(value) => field.onChange(value)}
                  error={errors.memberId?.message}
                />
              )}
            />
          </div>

          <DialogFooter className='mt-4'>
            <Button type='submit' className='w-full h-12 text-md font-normal'>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
