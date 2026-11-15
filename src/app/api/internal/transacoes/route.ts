import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bancaId, contaId, tipo, valor, descricao } = body;

    if (!bancaId || !tipo || !valor) {
      return NextResponse.json(
        { error: "Banca, tipo e valor são obrigatórios" },
        { status: 400 }
      );
    }

    const val = parseFloat(valor);
    if (isNaN(val) || val <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }

    // Executar movimentação contábil dentro de uma transação do banco
    const result = await prisma.$transaction(async (tx) => {
      const banca = await tx.banca.findUnique({
        where: { id: bancaId },
      });

      if (!banca) {
        throw new Error("Banca não encontrada");
      }

      if (tipo === "APORTE") {
        await tx.banca.update({
          where: { id: bancaId },
          data: { saldoBanco: banca.saldoBanco + val },
        });
      } else if (tipo === "RETIRADA") {
        if (banca.saldoBanco < val) {
          throw new Error("Saldo insuficiente no banco para retirada");
        }
        await tx.banca.update({
          where: { id: bancaId },
          data: { saldoBanco: banca.saldoBanco - val },
        });
      } else if (tipo === "DEPOSITO_CASA") {
        if (!contaId) {
          throw new Error("Casa de apostas deve ser selecionada para depósito");
        }
        if (banca.saldoBanco < val) {
          throw new Error("Saldo insuficiente no banco para transferir para a casa");
        }
        const conta = await tx.contaBookmaker.findUnique({ where: { id: contaId } });
        if (!conta) throw new Error("Conta da casa não encontrada");

        await tx.banca.update({
          where: { id: bancaId },
          data: { saldoBanco: banca.saldoBanco - val },
        });
        await tx.contaBookmaker.update({
          where: { id: contaId },
          data: { saldoAtual: conta.saldoAtual + val },
        });
      } else if (tipo === "SAQUE_CASA") {
        if (!contaId) {
          throw new Error("Casa de apostas deve ser selecionada para saque");
        }
        const conta = await tx.contaBookmaker.findUnique({ where: { id: contaId } });
        if (!conta) throw new Error("Conta da casa não encontrada");
        if (conta.saldoAtual < val) {
          throw new Error("Saldo insuficiente na casa de apostas para saque");
        }

        await tx.contaBookmaker.update({
          where: { id: contaId },
          data: { saldoAtual: conta.saldoAtual - val },
        });
        await tx.banca.update({
          where: { id: bancaId },
          data: { saldoBanco: banca.saldoBanco + val },
        });
      } else if (tipo === "AJUSTE") {
        if (contaId) {
          await tx.contaBookmaker.update({
            where: { id: contaId },
            data: { saldoAtual: val },
          });
        } else {
          await tx.banca.update({
            where: { id: bancaId },
            data: { saldoBanco: val },
          });
        }
      } else {
        throw new Error("Tipo de transação desconhecido");
      }

      // Registrar o log da transação
      const transacao = await tx.transacao.create({
        data: {
          bancaId,
          contaId: contaId || null,
          tipo,
          valor: val,
          descricao: descricao || "",
        },
      });

      return transacao;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao realizar transação:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao realizar transação financeira" },
      { status: 400 }
    );
  }
}
