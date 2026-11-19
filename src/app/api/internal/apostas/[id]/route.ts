import { NextRequest } from "next/server";
import { handle, json, readJson, requireUser, sameOrigin } from "@/lib/auth/http";
import { HttpError, objectInput } from "@/lib/auth/security";
import { prisma } from "@/lib/prisma";
import { calcularLucroPrejuizo } from "@/lib/calculations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const sessionUser = await requireUser(req);
    sameOrigin(req);
    const { id } = await params;
    const body = objectInput(await readJson(req), ["status","odd","stake","evento","mercado","tipster","esporte"]) as Record<string, any>;
    const { status, odd, stake, evento, mercado, tipster, esporte } = body;

    const apostaExistente = await prisma.aposta.findFirst({
      where: { id, banca: { userId: sessionUser.id } },
      include: { conta: true },
    });

    if (!apostaExistente) {
      return json({ error: "Aposta não encontrada" }, 404);
    }

    const newStatus = status !== undefined ? status : apostaExistente.status;
    const newOdd = odd !== undefined ? parseFloat(odd) : apostaExistente.odd;
    const newStake = stake !== undefined ? parseFloat(stake) : apostaExistente.stake;
    const newLucro = calcularLucroPrejuizo(newStake, newOdd, newStatus);

    // Ajustar saldo da casa se o status ou lucro mudou
    const updated = await prisma.$transaction(async (tx) => {
      if (apostaExistente.contaId && !await tx.contaBookmaker.findFirst({ where: { id: apostaExistente.contaId, bancaId: apostaExistente.bancaId, banca: { userId: sessionUser.id } }, select: { id: true } })) throw new HttpError(404, "Conta n\u00e3o encontrada");
      // Reverter impacto anterior se existia
      if (apostaExistente.contaId && apostaExistente.lucroPrejuizo !== null) {
        await tx.contaBookmaker.update({
          where: { id: apostaExistente.contaId },
          data: {
            saldoAtual: {
              decrement: apostaExistente.lucroPrejuizo,
            },
          },
        });
      }

      // Aplicar novo impacto
      if (apostaExistente.contaId && newLucro !== null) {
        await tx.contaBookmaker.update({
          where: { id: apostaExistente.contaId },
          data: {
            saldoAtual: {
              increment: newLucro,
            },
          },
        });
      }

      return tx.aposta.update({
        where: { id },
        data: {
          status: newStatus,
          odd: newOdd,
          stake: newStake,
          lucroPrejuizo: newLucro,
          evento: evento !== undefined ? evento : apostaExistente.evento,
          mercado: mercado !== undefined ? mercado : apostaExistente.mercado,
          tipster: tipster !== undefined ? tipster : apostaExistente.tipster,
          esporte: esporte !== undefined ? esporte : apostaExistente.esporte,
        },
        include: {
          conta: true,
        },
      });
    });

    return json(updated);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const sessionUser = await requireUser(req);
    sameOrigin(req);
    const { id } = await params;
    const aposta = await prisma.aposta.findFirst({ where: { id, banca: { userId: sessionUser.id } } });

    if (!aposta) {
      return json({ error: "Aposta não encontrada" }, 404);
    }

    await prisma.$transaction(async (tx) => {
      if (aposta.contaId && !await tx.contaBookmaker.findFirst({ where: { id: aposta.contaId, bancaId: aposta.bancaId, banca: { userId: sessionUser.id } }, select: { id: true } })) throw new HttpError(404, "Conta n\u00e3o encontrada");
      // Se tinha lucro no bookmaker, reverte
      if (aposta.contaId && aposta.lucroPrejuizo !== null) {
        await tx.contaBookmaker.update({
          where: { id: aposta.contaId },
          data: {
            saldoAtual: {
              decrement: aposta.lucroPrejuizo,
            },
          },
        });
      }
      await tx.aposta.delete({ where: { id } });
    });

    return json({ success: true });
  });
}
