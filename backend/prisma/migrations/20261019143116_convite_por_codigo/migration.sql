-- Migração "convite por código" (ver docs/plans/02-BACKEND-convite-por-codigo.md).
--
-- Substitui o convite por e-mail (EnvironmentInvite, por pessoa específica) por um código de
-- convite reutilizável por ambiente (EnvironmentInviteCode) e introduz a terceira permissão
-- "pending" em EnvironmentRole. Sem backfill: convites pendentes em andamento não são histórico
-- financeiro, perdê-los é aceitável.

-- DropForeignKey
ALTER TABLE "public"."EnvironmentInvite" DROP CONSTRAINT "EnvironmentInvite_environmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EnvironmentInvite" DROP CONSTRAINT "EnvironmentInvite_invitedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EnvironmentInvite" DROP CONSTRAINT "EnvironmentInvite_invitedUserId_fkey";

-- DropTable
DROP TABLE "public"."EnvironmentInvite";

-- DropEnum
DROP TYPE "public"."EnvironmentInviteStatus";

-- AlterEnum
ALTER TYPE "public"."EnvironmentRole" ADD VALUE 'pending';

-- CreateTable
CREATE TABLE "public"."EnvironmentInviteCode" (
    "environmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvironmentInviteCode_pkey" PRIMARY KEY ("environmentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnvironmentInviteCode_code_key" ON "public"."EnvironmentInviteCode"("code");

-- AddForeignKey
ALTER TABLE "public"."EnvironmentInviteCode" ADD CONSTRAINT "EnvironmentInviteCode_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "public"."Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EnvironmentInviteCode" ADD CONSTRAINT "EnvironmentInviteCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
