import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularLucroPrejuizo } from "@/lib/calculations";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, odd, stake, evento, mercado, tipster, esporte } = body;

    const apostaExistente = await prisma.aposta.findUnique({
      where: { id },
      include: { conta: true },
    });

    if (!apostaExistente) {
      return NextResponse.json({ error: "Aposta não encontrada" }, { status: 404 });
    }

    const newStatus = status !== undefined ? status : apostaExistente.status;
    const newOdd = odd !== undefined ? parseFloat(odd) : apostaExistente.odd;
    const newStake = stake !== undefined ? parseFloat(stake) : apostaExistente.stake;
    const newLucro = calcularLucroPrejuizo(newStake, newOdd, newStatus);

    // Ajustar saldo da casa se o status ou lucro mudou
    const updated = await prisma.$transaction(async (tx) => {
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar aposta:", error);
    return NextResponse.json({ error: "Erro ao atualizar aposta" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const aposta = await prisma.aposta.findUnique({ where: { id } });

    if (!aposta) {
      return NextResponse.json({ error: "Aposta não encontrada" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar aposta:", error);
    return NextResponse.json({ error: "Erro ao deletar aposta" }, { status: 500 });
  }
}
