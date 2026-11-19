import { NextRequest } from "next/server";
import { handle, json, readJson, requireUser, sameOrigin } from "@/lib/auth/http";
import { HttpError, objectInput } from "@/lib/auth/security";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const sessionUser = await requireUser(req);
    sameOrigin(req);
    const body = objectInput(await readJson(req), ["bancaId","contaId","tipo","valor","descricao"]) as Record<string, any>;
    const { bancaId, contaId, tipo, valor, descricao } = body;

    if (!bancaId || !tipo || !valor) {
      return json(
        { error: "Banca, tipo e valor são obrigatórios" },
        400
      );
    }

    const val = parseFloat(valor);
    if (isNaN(val) || val <= 0) {
      return json({ error: "Valor inválido" }, 400);
    }

    // Executar movimentação contábil dentro de uma transação do banco
    const result = await prisma.$transaction(async (tx) => {
      const banca = await tx.banca.findFirst({
        where: { id: bancaId, userId: sessionUser.id },
      });

      if (!banca) {
        throw new HttpError(404, "Banca não encontrada");
      }

      if (contaId && !await tx.contaBookmaker.findFirst({ where: { id: contaId, bancaId }, select: { id: true } })) throw new HttpError(404, "Conta n\u00e3o encontrada");

      if (tipo === "APORTE") {
        await tx.banca.update({
          where: { id: bancaId },
          data: { saldoBanco: banca.saldoBanco + val },
        });
      } else if (tipo === "RETIRADA") {
        if (banca.saldoBanco < val) {
          throw new HttpError(400, "Saldo insuficiente no banco para retirada");
        }
        await tx.banca.update({
          where: { id: bancaId },
          data: { saldoBanco: banca.saldoBanco - val },
        });
      } else if (tipo === "DEPOSITO_CASA") {
        if (!contaId) {
          throw new HttpError(400, "Casa de apostas deve ser selecionada para depósito");
        }
        if (banca.saldoBanco < val) {
          throw new HttpError(400, "Saldo insuficiente no banco para transferir para a casa");
        }
        const conta = await tx.contaBookmaker.findUnique({ where: { id: contaId } });
        if (!conta) throw new HttpError(404, "Conta da casa não encontrada");

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
          throw new HttpError(400, "Casa de apostas deve ser selecionada para saque");
        }
        const conta = await tx.contaBookmaker.findUnique({ where: { id: contaId } });
        if (!conta) throw new HttpError(404, "Conta da casa não encontrada");
        if (conta.saldoAtual < val) {
          throw new HttpError(400, "Saldo insuficiente na casa de apostas para saque");
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
        throw new HttpError(400, "Tipo de transação desconhecido");
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

    return json(result, 201);
  });
}
