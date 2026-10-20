/* eslint-disable @typescript-eslint/no-unused-expressions */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import type { NewTransactionForm, TransactionFormModalProps } from "./models";
import { TypeSelector } from "./components/TypeSelector";
import { PaymentMethodSelector } from "./components/PaymentMethodSelector";
import { CustomInput } from "@/components/CustomInput";
import { CustomCheckbox } from "@/components/CustomCheckbox";
import { formatCurrency } from "@/utils/formatCurrency";
import { stringToNumber } from "@/utils/stringToNumber";
import { DatePicker } from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/CustomSelect";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { transactionService } from "../../pages/Transactions/services";
import { useEffect, useMemo } from "react";
import { useEnvironmentStore } from "@/stores/environment";

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
  paymentMethod: yup.string().oneOf(["debit", "credit"]).notRequired(),
  amountIsTotal: yup.boolean().notRequired(),
  // installmentsCount só é validado em Crédito — em Débito o campo nem aparece no formulário, e
  // uma regra fixa aqui bloquearia o submit de uma transação comum (ver plano de frontend).
  installmentsCount: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? undefined : value))
    .when("paymentMethod", {
      is: "credit",
      then: (schema) =>
        schema
          .required("Número de parcelas é obrigatório")
          .min(2, "Pra 1x, use Débito.")
          .max(60, "Máximo de 60 parcelas."),
      otherwise: (schema) => schema.notRequired(),
    }),
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

  const myMemberId = currentEnvironment?.myMembership?.id;

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
      paymentMethod: "debit",
      amountIsTotal: true,
      installmentsCount: undefined,
    },
    resolver: yupResolver(validationSchema) as Resolver<NewTransactionForm>,
  });

  const paymentMethod = useWatch({ control, name: "paymentMethod" });
  const amountIsTotal = useWatch({ control, name: "amountIsTotal" });
  const amountValue = useWatch({ control, name: "amount" });
  const installmentsCountValue = useWatch({ control, name: "installmentsCount" });

  const isCredit = paymentMethod === "credit";

  const amountLabel = !isCredit
    ? "Valor"
    : amountIsTotal
    ? "Valor total da compra"
    : "Valor de cada parcela";

  // Prévia client-side, só pra feedback visual imediato (arredondada a 2 casas decimais pra
  // exibição) — a conta de verdade, com arredondamento na última parcela, é feita no backend.
  const installmentsPreview = useMemo(() => {
    if (!isCredit) return "";

    const installments = installmentsCountValue;
    if (!installments || installments < 2) return "";

    const amountNumber = stringToNumber(amountValue ?? "");
    if (!amountNumber || amountNumber <= 0) return "";

    if (amountIsTotal) {
      return `${installments}x de R$ ${formatCurrency(amountNumber / installments)}`;
    }

    return `Total: R$ ${formatCurrency(amountNumber * installments)}`;
  }, [isCredit, installmentsCountValue, amountValue, amountIsTotal]);

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
    } else if (formData.paymentMethod === "credit") {
      try {
        const { data } = await transactionService.createInstallmentPurchase(payload);

        if (data?.createInstallmentPurchase) {
          toast.success(`${data.createInstallmentPurchase.length} parcelas criadas`);
          setIsOpen(false);
          reset();

          if (fetchData) await fetchData();
        }
      } catch {
        toast.error("Erro ao criar a compra parcelada.");
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
            {!isEdit && (
              <Controller
                control={control}
                name='paymentMethod'
                render={({ field }) => (
                  <PaymentMethodSelector value={field.value ?? "debit"} setValue={setValue} />
                )}
              />
            )}
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
                    label={isCredit ? "Data da 1ª parcela" : "Data"}
                    placeholder='Selecione'
                    error={errors.date?.message}
                    value={field.value ?? null}
                    onChange={(d) => field.onChange(d)}
                  />
                )}
              />
              <div className='space-y-2'>
                <Controller
                  control={control}
                  name='amount'
                  render={({ field }) => (
                    <CustomInput
                      id='amount'
                      type='text'
                      label={amountLabel}
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
                {isCredit && (
                  <Controller
                    control={control}
                    name='amountIsTotal'
                    render={({ field }) => (
                      <CustomCheckbox
                        id='amountIsTotal'
                        label='Esse é o valor total da compra'
                        checked={field.value ?? true}
                        onChange={(checked) => field.onChange(checked)}
                      />
                    )}
                  />
                )}
              </div>
            </div>
            {isCredit && (
              <div className='grid grid-cols-2 items-start gap-2'>
                <Controller
                  control={control}
                  name='installmentsCount'
                  render={({ field }) => (
                    <CustomInput
                      id='installmentsCount'
                      type='number'
                      label='Número de parcelas'
                      placeholder='Ex: 12'
                      min={2}
                      max={60}
                      step={1}
                      error={errors.installmentsCount?.message}
                      value={field.value !== undefined && field.value !== null ? String(field.value) : ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        field.onChange(raw === "" ? undefined : Number(raw));
                      }}
                    />
                  )}
                />
                {installmentsPreview && (
                  <div className='flex items-center h-12 text-sm text-zinc-500'>
                    {installmentsPreview}
                  </div>
                )}
              </div>
            )}
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
