import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bancaId = searchParams.get("banca_id");
    const mesParam = searchParams.get("mes"); // Formato: YYYY-MM

    let targetDate = new Date();
    if (mesParam && mesParam.includes("-")) {
      const [ano, mes] = mesParam.split("-").map(Number);
      targetDate = new Date(ano, mes - 1, 1);
    }

    const ano = targetDate.getFullYear();
    const mes = targetDate.getMonth();

    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0, 23, 59, 59, 999);

    const where: any = {
      dataJogo: {
        gte: primeiroDia,
        lte: ultimoDia,
      },
      status: {
        not: "PENDENTE",
      },
    };

    if (bancaId) {
      where.bancaId = bancaId;
    }

    const apostas = await prisma.aposta.findMany({
      where,
      orderBy: { dataJogo: "asc" },
    });

    // Mapear por dia do mês
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const mapDias = new Map<number, {
      lucro: number;
      stakeTotal: number;
      totalApostas: number;
      greens: number;
      reds: number;
    }>();

    for (let d = 1; d <= diasNoMes; d++) {
      mapDias.set(d, {
        lucro: 0,
        stakeTotal: 0,
        totalApostas: 0,
        greens: 0,
        reds: 0,
      });
    }

    let maiorGreen = { evento: "-", lucro: 0 };
    let maiorRed = { evento: "-", prejuizo: 0 };

    for (const a of apostas) {
      const d = a.dataJogo.getDate();
      const curr = mapDias.get(d)!;
      curr.lucro += a.lucroPrejuizo || 0;
      curr.stakeTotal += a.stake;
      curr.totalApostas += 1;
      if (a.status === "GREEN" || a.status === "MEIO_GREEN") curr.greens += 1;
      if (a.status === "RED" || a.status === "MEIO_RED") curr.reds += 1;

      if ((a.lucroPrejuizo || 0) > maiorGreen.lucro) {
        maiorGreen = { evento: a.evento, lucro: a.lucroPrejuizo || 0 };
      }
      if ((a.lucroPrejuizo || 0) < maiorRed.prejuizo) {
        maiorRed = { evento: a.evento, prejuizo: a.lucroPrejuizo || 0 };
      }
    }

    const days = [];
    let melhorDia = { dia: 0, lucro: -Infinity };
    let piorDia = { dia: 0, lucro: Infinity };
    let totalLucroMes = 0;
    let totalStakeMes = 0;
    let totalGreensMes = 0;
    let totalApostasMes = 0;

    for (let d = 1; d <= diasNoMes; d++) {
      const curr = mapDias.get(d)!;
      const dateStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const roi = curr.stakeTotal > 0 ? (curr.lucro / curr.stakeTotal) * 100 : 0;

      totalLucroMes += curr.lucro;
      totalStakeMes += curr.stakeTotal;
      totalGreensMes += curr.greens;
      totalApostasMes += curr.totalApostas;

      if (curr.totalApostas > 0) {
        if (curr.lucro > melhorDia.lucro) melhorDia = { dia: d, lucro: curr.lucro };
        if (curr.lucro < piorDia.lucro) piorDia = { dia: d, lucro: curr.lucro };
      }

      days.push({
        dia: d,
        date: dateStr,
        lucro: Number(curr.lucro.toFixed(2)),
        stakeTotal: Number(curr.stakeTotal.toFixed(2)),
        roi: Number(roi.toFixed(1)),
        totalApostas: curr.totalApostas,
        greens: curr.greens,
        reds: curr.reds,
      });
    }

    const roiMes = totalStakeMes > 0 ? (totalLucroMes / totalStakeMes) * 100 : 0;
    const winRateMes = totalApostasMes > 0 ? (totalGreensMes / totalApostasMes) * 100 : 0;

    return NextResponse.json({
      mes: `${ano}-${String(mes + 1).padStart(2, "0")}`,
      days,
      stats: {
        melhorDia: melhorDia.dia > 0 ? melhorDia : null,
        piorDia: piorDia.dia > 0 ? piorDia : null,
        maiorGreen,
        maiorRed,
        lucroMes: Number(totalLucroMes.toFixed(2)),
        stakeMes: Number(totalStakeMes.toFixed(2)),
        roiMes: Number(roiMes.toFixed(1)),
        winRateMes: Number(winRateMes.toFixed(1)),
        totalApostasMes,
      },
    });
  } catch (error) {
    console.error("Erro em /api/internal/analysis/calendar:", error);
    return NextResponse.json({ error: "Erro ao carregar calendário" }, { status: 500 });
  }
}
