import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const esporte = searchParams.get("esporte");
    const resultado = searchParams.get("resultado");

    const where: any = {};
    if (esporte && esporte !== "TODOS") where.esporte = esporte;
    if (resultado && resultado !== "TODOS") where.resultado = resultado;

    const tips = await prisma.tip.findMany({
      where,
      orderBy: { dataEvento: "desc" },
    });

    return NextResponse.json(tips);
  } catch (error) {
    console.error("Erro em /api/internal/tips:", error);
    return NextResponse.json({ error: "Erro ao buscar tips" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { titulo, descricao, esporte, evento, mercado, oddRecomendada, stakeSugerida } = body;

    if (!titulo || !evento || !mercado || !oddRecomendada) {
      return NextResponse.json(
        { error: "Título, evento, mercado e odd recomendada são obrigatórios" },
        { status: 400 }
      );
    }

    const tip = await prisma.tip.create({
      data: {
        titulo,
        descricao,
        esporte: esporte || "Futebol",
        evento,
        mercado,
        oddRecomendada: parseFloat(oddRecomendada) || 1.8,
        stakeSugerida: parseFloat(stakeSugerida) || 1.0,
      },
    });

    return NextResponse.json(tip, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar tip:", error);
    return NextResponse.json({ error: "Erro ao criar tip" }, { status: 500 });
  }
}
