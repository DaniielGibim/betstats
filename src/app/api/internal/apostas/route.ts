import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularLucroPrejuizo } from "@/lib/calculations";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bancaId = searchParams.get("banca_id");
    const status = searchParams.get("status");
    const esporte = searchParams.get("esporte");
    const tipster = searchParams.get("tipster");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: any = {};
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

    return NextResponse.json({
      data: apostas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro em /api/internal/apostas:", error);
    return NextResponse.json({ error: "Erro ao listar apostas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
      return NextResponse.json(
        { error: "Banca, evento, mercado, odd e stake são obrigatórios" },
        { status: 400 }
      );
    }

    const numericOdd = parseFloat(odd);
    const numericStake = parseFloat(stake);
    const lucro = calcularLucroPrejuizo(numericStake, numericOdd, status);

    const aposta = await prisma.$transaction(async (tx) => {
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

    return NextResponse.json(aposta, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar aposta:", error);
    return NextResponse.json({ error: "Erro ao criar aposta" }, { status: 500 });
  }
}
