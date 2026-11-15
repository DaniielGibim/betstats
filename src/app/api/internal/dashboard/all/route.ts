import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bancaId = searchParams.get("banca_id");
    const startDateParam = searchParams.get("data_jogo[startDate]") || searchParams.get("startDate");
    const endDateParam = searchParams.get("data_jogo[endDate]") || searchParams.get("endDate");
    const statusParam = searchParams.get("status");
    const tipsterParam = searchParams.get("tipster");
    const bookmakerParam = searchParams.get("bookmaker");

    // Selecionar banca alvo
    let banca = null;
    if (bancaId) {
      banca = await prisma.banca.findUnique({
        where: { id: bancaId },
        include: { contas: true },
      });
    } else {
      banca = await prisma.banca.findFirst({
        where: { padrao: true },
        include: { contas: true },
      });
      if (!banca) {
        banca = await prisma.banca.findFirst({ include: { contas: true } });
      }
    }

    if (!banca) {
      return NextResponse.json({
        widgets: {
          apostas_concluidas: 0,
          total_apostas: 0,
          total_investido: 0,
          lucro_total: 0,
          saldo_banca: 0,
          roi: 0,
          taxa_acerto: 0,
          total_resolvidas: 0,
          apostas_ganhas: 0,
          derrotas: 0,
          taxa_texto: "0.0% (0 derrotas de 0 aposta)",
        },
        profit: { dailyProfit: [], profitByTipster: [] },
        sportsSummary: [],
        bookmakerSummary: [],
      });
    }

    // Montar filtros das apostas
    const where: any = {
      bancaId: banca.id,
    };

    if (startDateParam || endDateParam) {
      where.dataJogo = {};
      if (startDateParam) where.dataJogo.gte = new Date(startDateParam);
      if (endDateParam) where.dataJogo.lte = new Date(endDateParam);
    }

    if (statusParam && statusParam !== "TODOS") {
      where.status = statusParam;
    }

    if (tipsterParam && tipsterParam !== "TODOS") {
      where.tipster = tipsterParam;
    }

    if (bookmakerParam && bookmakerParam !== "TODOS") {
      where.conta = {
        nomeCasa: bookmakerParam,
      };
    }

    const apostas = await prisma.aposta.findMany({
      where,
      include: { conta: true },
      orderBy: { dataJogo: "asc" },
    });

    // Calcular métricas
    const resolvidas = apostas.filter((a) => a.status !== "PENDENTE");
    const totalApostas = apostas.length;
    const apostasConcluidas = resolvidas.length;

    const totalInvestido = resolvidas.reduce((acc, a) => acc + a.stake, 0);
    const lucroTotal = resolvidas.reduce((acc, a) => acc + (a.lucroPrejuizo || 0), 0);

    const apostasGanhas = resolvidas.filter(
      (a) => a.status === "GREEN" || a.status === "MEIO_GREEN"
    ).length;
    const derrotas = resolvidas.filter(
      (a) => a.status === "RED" || a.status === "MEIO_RED"
    ).length;

    const roi = totalInvestido > 0 ? (lucroTotal / totalInvestido) * 100 : 0;
    const taxaAcerto = apostasConcluidas > 0 ? (apostasGanhas / apostasConcluidas) * 100 : 0;

    const saldoCasas = banca.contas.reduce((acc, c) => acc + (c.saldoAtual || 0), 0);
    const saldoBanca = banca.saldoBanco + saldoCasas;

    // Lucro diário agrupado e lucro acumulado
    const dailyMap = new Map<string, number>();
    for (const a of resolvidas) {
      const dateKey = a.dataJogo.toISOString().split("T")[0];
      const cur = dailyMap.get(dateKey) || 0;
      dailyMap.set(dateKey, cur + (a.lucroPrejuizo || 0));
    }

    const dailyProfit: { date: string; profit: number; acumulado: number }[] = [];
    let acumulado = 0;
    const sortedDates = Array.from(dailyMap.keys()).sort();
    for (const d of sortedDates) {
      const p = dailyMap.get(d) || 0;
      acumulado += p;
      dailyProfit.push({
        date: d,
        profit: Number(p.toFixed(2)),
        acumulado: Number(acumulado.toFixed(2)),
      });
    }

    // Lucro por Tipster
    const tipsterMap = new Map<string, number>();
    for (const a of resolvidas) {
      const t = a.tipster || "Sem tipster";
      const cur = tipsterMap.get(t) || 0;
      tipsterMap.set(t, cur + (a.lucroPrejuizo || 0));
    }

    const profitByTipster = Array.from(tipsterMap.entries()).map(([tipster, profit]) => ({
      tipster,
      profit: Number(profit.toFixed(2)),
    }));

    // Resumo por Esporte
    const sportsMap = new Map<
      string,
      { apostas: number; greens: number; lucro: number; stakeTotal: number }
    >();
    for (const a of resolvidas) {
      const esp = a.esporte || "Outros";
      const cur = sportsMap.get(esp) || { apostas: 0, greens: 0, lucro: 0, stakeTotal: 0 };
      cur.apostas += 1;
      if (a.status === "GREEN" || a.status === "MEIO_GREEN") cur.greens += 1;
      cur.lucro += a.lucroPrejuizo || 0;
      cur.stakeTotal += a.stake;
      sportsMap.set(esp, cur);
    }

    const sportsSummary = Array.from(sportsMap.entries()).map(([esporte, s]) => {
      const stakeMedia = s.apostas > 0 ? (s.stakeTotal / s.apostas).toFixed(2) : "0.00";
      const roiSport = s.stakeTotal > 0 ? (s.lucro / s.stakeTotal) * 100 : 0;
      const aprov = s.apostas > 0 ? (s.greens / s.apostas) * 100 : 0;
      return {
        esporte,
        Apostas: s.apostas,
        Greens: String(s.greens),
        Lucro: Number(s.lucro.toFixed(2)),
        StakeMedia: stakeMedia,
        ROI: Number(roiSport.toFixed(2)),
        Aproveitamento: aprov.toFixed(1),
      };
    });

    // Resumo por Casa de Aposta
    const bookmakerMap = new Map<
      string,
      { apostas: number; greens: number; lucro: number; stakeTotal: number }
    >();
    for (const a of resolvidas) {
      const bm = a.conta?.nomeCasa || "Outras";
      const cur = bookmakerMap.get(bm) || { apostas: 0, greens: 0, lucro: 0, stakeTotal: 0 };
      cur.apostas += 1;
      if (a.status === "GREEN" || a.status === "MEIO_GREEN") cur.greens += 1;
      cur.lucro += a.lucroPrejuizo || 0;
      cur.stakeTotal += a.stake;
      bookmakerMap.set(bm, cur);
    }

    const bookmakerSummary = Array.from(bookmakerMap.entries()).map(([bookmaker, b]) => {
      const stakeMedia = b.apostas > 0 ? (b.stakeTotal / b.apostas).toFixed(2) : "0.00";
      const roiBm = b.stakeTotal > 0 ? (b.lucro / b.stakeTotal) * 100 : 0;
      const aprov = b.apostas > 0 ? (b.greens / b.apostas) * 100 : 0;
      return {
        bookmaker,
        Apostas: b.apostas,
        Greens: String(b.greens),
        Lucro: Number(b.lucro.toFixed(2)),
        StakeMedia: stakeMedia,
        ROI: Number(roiBm.toFixed(2)),
        Aproveitamento: aprov.toFixed(1),
      };
    });

    return NextResponse.json({
      widgets: {
        apostas_concluidas: apostasConcluidas,
        total_apostas: totalApostas,
        total_investido: Number(totalInvestido.toFixed(2)),
        lucro_total: Number(lucroTotal.toFixed(2)),
        saldo_banca: Number(saldoBanca.toFixed(2)),
        roi: Number(roi.toFixed(1)),
        taxa_acerto: Number(taxaAcerto.toFixed(1)),
        total_resolvidas: apostasConcluidas,
        apostas_ganhas: apostasGanhas,
        derrotas: derrotas,
        taxa_texto: `${taxaAcerto.toFixed(1)}% (${derrotas} derrotas de ${apostasConcluidas} apostas)`,
      },
      profit: {
        dailyProfit,
        profitByTipster,
      },
      sportsSummary,
      bookmakerSummary,
    });
  } catch (error) {
    console.error("Erro em /api/internal/dashboard/all:", error);
    return NextResponse.json({ error: "Erro ao gerar dashboard" }, { status: 500 });
  }
}
