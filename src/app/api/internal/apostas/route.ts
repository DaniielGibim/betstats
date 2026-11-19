import { NextRequest } from "next/server";
import { handle, json, readJson, requireUser, sameOrigin } from "@/lib/auth/http";
import { HttpError, objectInput } from "@/lib/auth/security";
import { prisma } from "@/lib/prisma";
import { calcularLucroPrejuizo } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const sessionUser = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const bancaId = searchParams.get("banca_id");
    const status = searchParams.get("status");
    const esporte = searchParams.get("esporte");
    const tipster = searchParams.get("tipster");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: any = { banca: { userId: sessionUser.id } };
    if (bancaId && !await prisma.banca.findFirst({ where: { id: bancaId, userId: sessionUser.id }, select: { id: true } })) throw new HttpError(404, "Banca n\u00e3o encontrada");
    if (bancaId) where.bancaId = bancaId;
    if (status && status !== "TODOS") where.status = status;
    if (esporte && esporte !== "TODOS") where.esporte = esporte;
    if (tipster && tipster !== "TODOS") where.tipster = tipster;
    if (search) {
      where.OR = [
        { evento: { contains: search } },
        { mercado: { contains: search } },
        { tipster: { contains: search } },
      ];
    }

    const [apostas, total] = await Promise.all([
      prisma.aposta.findMany({
        where,
        include: {
          conta: true,
          banca: true,
        },
        orderBy: {
          dataJogo: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.aposta.count({ where }),
    ]);

    return json({
      // Do not expose a foreign account through an inconsistent legacy link.
      data: apostas.map(aposta => aposta.conta && aposta.conta.bancaId !== aposta.bancaId
        ? { ...aposta, contaId: null, conta: null } : aposta),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const sessionUser = await requireUser(req);
    sameOrigin(req);
    const body = objectInput(await readJson(req), ["bancaId","contaId","esporte","evento","mercado","odd","stake","status","tipster","dataJogo","observacoes"]) as Record<string, any>;
    const {
      bancaId,
      contaId,
      esporte,
      evento,
      mercado,
      odd,
      stake,
      status = "PENDENTE",
      tipster,
      dataJogo,
      observacoes,
    } = body;

    if (!bancaId || !evento || !mercado || !odd || !stake) {
      return json(
        { error: "Banca, evento, mercado, odd e stake são obrigatórios" },
        400
      );
    }

    const numericOdd = parseFloat(odd);
    const numericStake = parseFloat(stake);
    const lucro = calcularLucroPrejuizo(numericStake, numericOdd, status);

    const aposta = await prisma.$transaction(async (tx) => {
      if (!await tx.banca.findFirst({ where: { id: bancaId, userId: sessionUser.id }, select: { id: true } })) throw new HttpError(404, "Banca n\u00e3o encontrada");
      if (contaId && !await tx.contaBookmaker.findFirst({ where: { id: contaId, bancaId }, select: { id: true } })) throw new HttpError(404, "Conta n\u00e3o encontrada");
      const novaAposta = await tx.aposta.create({
        data: {
          bancaId,
          contaId: contaId || null,
          esporte: esporte || "Futebol",
          evento,
          mercado,
          odd: numericOdd,
          stake: numericStake,
          status,
          lucroPrejuizo: lucro,
          tipster: tipster || "Sem tipster",
          dataJogo: dataJogo ? new Date(dataJogo) : new Date(),
          observacoes,
        },
        include: {
          conta: true,
        },
      });

      // Se a aposta já for criada com status resolvido e tiver conta vinculada, atualiza o saldo da casa
      if (contaId && lucro !== null) {
        await tx.contaBookmaker.update({
          where: { id: contaId },
          data: {
            saldoAtual: {
              increment: lucro,
            },
          },
        });
      }

      return novaAposta;
    });

    return json(aposta, 201);
  });
}
