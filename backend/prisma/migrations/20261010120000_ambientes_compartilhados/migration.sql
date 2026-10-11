-- Migração "ambientes compartilhados" (ver docs/plans/01-BACKEND-ambientes-compartilhados.md).
--
-- Diferente da migration anterior (20261009135224_init, só DDL), esta é uma migration de DADOS:
-- todo usuário já existente precisa ganhar um Environment pessoal + EnvironmentMember(role: admin)
-- antes de Category.environmentId / Transaction.environmentId / Transaction.memberId poderem se
-- tornar NOT NULL. A tabela temporária "_personal_environment_backfill" existe só para mapear
-- cada usuário ao seu novo Environment/EnvironmentMember dentro desta mesma transação (Prisma
-- Migrate roda cada migration.sql em uma única transação para providers com DDL transacional,
-- como Postgres) e é descartada ao final (ON COMMIT DROP).

-- CreateEnum
CREATE TYPE "public"."EnvironmentRole" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "public"."EnvironmentInviteStatus" AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- CreateTable
CREATE TABLE "public"."Environment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EnvironmentMember" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "public"."EnvironmentRole",
    "displayName" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "EnvironmentMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EnvironmentInvite" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "role" "public"."EnvironmentRole" NOT NULL,
    "status" "public"."EnvironmentInviteStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvironmentInvite_pkey" PRIMARY KEY ("id")
);

-- AlterTable: User ganha ambiente padrão (nullable — cai no pessoal se nulo/inacessível)
ALTER TABLE "public"."User" ADD COLUMN "defaultEnvironmentId" TEXT;

-- AlterTable: colunas novas nullable por enquanto, para permitir o backfill abaixo antes do NOT NULL
ALTER TABLE "public"."Category" ADD COLUMN "environmentId" TEXT;

ALTER TABLE "public"."Transaction" ADD COLUMN "environmentId" TEXT;
ALTER TABLE "public"."Transaction" ADD COLUMN "memberId" TEXT;

-- Transaction.userId é renomeada para createdBy (mesma FK para User, mesmo NOT NULL) — não há
-- duas colunas concorrentes nem perda de dados.
ALTER TABLE "public"."Transaction" RENAME COLUMN "userId" TO "createdBy";

-- Backfill de dados existentes: 1 Environment pessoal + 1 EnvironmentMember(role: admin) por User.
CREATE TEMPORARY TABLE "_personal_environment_backfill" (
    "userId" TEXT PRIMARY KEY,
    "environmentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO "_personal_environment_backfill" ("userId", "environmentId", "memberId")
SELECT "id", gen_random_uuid()::text, gen_random_uuid()::text
FROM "public"."User";

INSERT INTO "public"."Environment" ("id", "name", "isPersonal", "createdAt", "updatedAt")
SELECT b."environmentId", u."name", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_personal_environment_backfill" b
JOIN "public"."User" u ON u."id" = b."userId";

INSERT INTO "public"."EnvironmentMember" ("id", "environmentId", "userId", "role", "joinedAt")
SELECT b."memberId", b."environmentId", b."userId", 'admin', CURRENT_TIMESTAMP
FROM "_personal_environment_backfill" b;

-- Realoca toda Category/Transaction existente para o ambiente pessoal do respectivo dono.
UPDATE "public"."Category" c
SET "environmentId" = b."environmentId"
FROM "_personal_environment_backfill" b
WHERE c."userId" = b."userId";

UPDATE "public"."Transaction" t
SET "environmentId" = b."environmentId",
    "memberId" = b."memberId"
FROM "_personal_environment_backfill" b
WHERE t."createdBy" = b."userId";

-- Agora que todo registro existente foi realocado, as colunas podem se tornar obrigatórias.
ALTER TABLE "public"."Category" ALTER COLUMN "environmentId" SET NOT NULL;
ALTER TABLE "public"."Transaction" ALTER COLUMN "environmentId" SET NOT NULL;
ALTER TABLE "public"."Transaction" ALTER COLUMN "memberId" SET NOT NULL;

-- DropForeignKey (FKs antigas baseadas em userId)
ALTER TABLE "public"."Category" DROP CONSTRAINT "Category_userId_fkey";

ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- DropIndex (índices/constraints antigos baseados em userId)
DROP INDEX "public"."Category_userId_title_key";

DROP INDEX "public"."Transaction_userId_idx";

-- DropColumn: Category.userId é removida sem substituto (categoria não guarda autor)
ALTER TABLE "public"."Category" DROP COLUMN "userId";

-- CreateIndex
CREATE UNIQUE INDEX "EnvironmentMember_environmentId_userId_key" ON "public"."EnvironmentMember"("environmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_environmentId_title_key" ON "public"."Category"("environmentId", "title");

-- CreateIndex
CREATE INDEX "Transaction_environmentId_idx" ON "public"."Transaction"("environmentId");

-- CreateIndex
CREATE INDEX "Transaction_memberId_idx" ON "public"."Transaction"("memberId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_defaultEnvironmentId_fkey" FOREIGN KEY ("defaultEnvironmentId") REFERENCES "public"."Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EnvironmentMember" ADD CONSTRAINT "EnvironmentMember_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "public"."Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EnvironmentMember" ADD CONSTRAINT "EnvironmentMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EnvironmentInvite" ADD CONSTRAINT "EnvironmentInvite_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "public"."Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EnvironmentInvite" ADD CONSTRAINT "EnvironmentInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EnvironmentInvite" ADD CONSTRAINT "EnvironmentInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "public"."Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "public"."Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."EnvironmentMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
