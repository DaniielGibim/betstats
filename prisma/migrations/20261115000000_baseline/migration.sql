-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'usuario',
    "slug" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "autoSettle" BOOLEAN NOT NULL DEFAULT true,
    "deteccaoCasa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserTelegram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "telegramId" TEXT,
    "name" TEXT,
    "username" TEXT,
    "codigoVinculo" TEXT,
    "codigoValidoAte" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserTelegram_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL DEFAULT 0.00,
    "periodicity" TEXT NOT NULL DEFAULT 'year',
    "limiteApostas" INTEGER NOT NULL DEFAULT 10,
    "limiteTips" INTEGER NOT NULL DEFAULT 10
);

-- CreateTable
CREATE TABLE "Assinatura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "Assinatura_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assinatura_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Banca" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "cor" TEXT NOT NULL DEFAULT '#3b82f6',
    "valorInicial" REAL NOT NULL DEFAULT 3000.00,
    "saldoBanco" REAL NOT NULL DEFAULT 3000.00,
    "unidadeEfetiva" REAL NOT NULL DEFAULT 100.00,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "padrao" BOOLEAN NOT NULL DEFAULT true,
    "compartilhada" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Banca_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContaBookmaker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bancaId" TEXT NOT NULL,
    "nomeCasa" TEXT NOT NULL,
    "saldoAtual" REAL NOT NULL DEFAULT 0.00,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContaBookmaker_bancaId_fkey" FOREIGN KEY ("bancaId") REFERENCES "Banca" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bancaId" TEXT NOT NULL,
    "contaId" TEXT,
    "tipo" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT,
    CONSTRAINT "Transacao_bancaId_fkey" FOREIGN KEY ("bancaId") REFERENCES "Banca" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transacao_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "ContaBookmaker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Aposta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bancaId" TEXT NOT NULL,
    "contaId" TEXT,
    "esporte" TEXT NOT NULL DEFAULT 'Futebol',
    "evento" TEXT NOT NULL,
    "mercado" TEXT NOT NULL,
    "odd" REAL NOT NULL DEFAULT 1.50,
    "stake" REAL NOT NULL DEFAULT 10.00,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "lucroPrejuizo" REAL,
    "tipster" TEXT,
    "dataJogo" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Aposta_bancaId_fkey" FOREIGN KEY ("bancaId") REFERENCES "Banca" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Aposta_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "ContaBookmaker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "esporte" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "mercado" TEXT NOT NULL,
    "oddRecomendada" REAL NOT NULL DEFAULT 1.80,
    "stakeSugerida" REAL NOT NULL DEFAULT 1.0,
    "resultado" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataEvento" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserTelegram_userId_key" ON "UserTelegram"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTelegram_telegramId_key" ON "UserTelegram"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_userId_key" ON "Assinatura"("userId");
