import { NextRequest } from "next/server";
import { handle, json, readJson, requireUser, sameOrigin } from "@/lib/auth/http";
import { objectInput } from "@/lib/auth/security";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser(req);
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

    return json(tips);
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireUser(req);
    sameOrigin(req);
    const body = objectInput(await readJson(req), ["titulo","descricao","esporte","evento","mercado","oddRecomendada","stakeSugerida"]) as Record<string, any>;
    const { titulo, descricao, esporte, evento, mercado, oddRecomendada, stakeSugerida } = body;

    if (!titulo || !evento || !mercado || !oddRecomendada) {
      return json(
        { error: "Título, evento, mercado e odd recomendada são obrigatórios" },
        400
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

    return json(tip, 201);
  });
}
