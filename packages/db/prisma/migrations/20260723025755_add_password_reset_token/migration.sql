-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('UserRestore', 'PasswordReset');

-- CreateTable
CREATE TABLE "Token" (
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "type" "TokenType" NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "Token_userId_idx" ON "Token"("userId");

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
