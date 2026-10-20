-- Migração "pagamento em crédito" (ver docs/plans/03-BACKEND-pagamento-credito.md).
--
-- Introduz InstallmentPurchase (agrupador/"recibo" de uma compra parcelada) e os campos
-- installmentPurchaseId/installmentNumber em Transaction, preenchidos quando a transação é uma
-- parcela gerada por createInstallmentPurchase. Ambos novos, nuláveis e sem backfill: nenhuma
-- transação existente é afetada.

-- AlterTable
ALTER TABLE "public"."Transaction" ADD COLUMN     "installmentNumber" INTEGER,
ADD COLUMN     "installmentPurchaseId" TEXT;

-- CreateTable
CREATE TABLE "public"."InstallmentPurchase" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "totalAmount" TEXT NOT NULL,
    "installmentAmount" TEXT NOT NULL,
    "installmentsCount" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallmentPurchase_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_installmentPurchaseId_fkey" FOREIGN KEY ("installmentPurchaseId") REFERENCES "public"."InstallmentPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstallmentPurchase" ADD CONSTRAINT "InstallmentPurchase_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstallmentPurchase" ADD CONSTRAINT "InstallmentPurchase_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "public"."Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstallmentPurchase" ADD CONSTRAINT "InstallmentPurchase_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."EnvironmentMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstallmentPurchase" ADD CONSTRAINT "InstallmentPurchase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
