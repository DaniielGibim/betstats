import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bancaId = searchParams.get("banca_id");

    let banca = null;
    if (bancaId) {
      banca = await prisma.banca.findUnique({
        where: { id: bancaId },
        include: { contas: true, transacoes: true, apostas: true },
      });
    } else {
      banca = await prisma.banca.findFirst({
        where: { padrao: true },
        include: { contas: true, transacoes: true, apostas: true },
      });
      if (!banca) {
        banca = await prisma.banca.findFirst({
          include: { contas: true, transacoes: true, apostas: true },
        });
      }
    }

    if (!banca) {
      return NextResponse.json({ error: "Nenhuma banca encontrada" }, { status: 404 });
    }

    const aportesTrans = banca.transacoes.filter((t) => t.tipo === "APORTE");
    const retiradasTrans = banca.transacoes.filter((t) => t.tipo === "RETIRADA");
    const depositosTrans = banca.transacoes.filter((t) => t.tipo === "DEPOSITO_CASA");
    const saquesTrans = banca.transacoes.filter((t) => t.tipo === "SAQUE_CASA");

    const aportesVal = aportesTrans.reduce((acc, t) => acc + t.valor, 0);
    const retiradasVal = retiradasTrans.reduce((acc, t) => acc + t.valor, 0);
    const depositosVal = depositosTrans.reduce((acc, t) => acc + t.valor, 0);
    const saquesVal = saquesTrans.reduce((acc, t) => acc + t.valor, 0);

    const apostasResolvidas = banca.apostas.filter((a) => a.status !== "PENDENTE");
    const resultadoApostas = apostasResolvidas.reduce(
      (acc, a) => acc + (a.lucroPrejuizo || 0),
      0
    );

    const apostasPendentes = banca.apostas.filter((a) => a.status === "PENDENTE");
    const valorPendentes = apostasPendentes.reduce((acc, a) => acc + a.stake, 0);

    const casasTotal = banca.contas.reduce((acc, c) => acc + (c.saldoAtual || 0), 0);
    const bancaTotal = banca.saldoBanco + casasTotal;

    const data = {
      depositos: { valor: Number(depositosVal.toFixed(2)), quantidade: depositosTrans.length },
      saques: { valor: Number(saquesVal.toFixed(2)), quantidade: saquesTrans.length },
      aportes: { valor: Number(aportesVal.toFixed(2)), quantidade: aportesTrans.length },
      retiradas: { valor: Number(retiradasVal.toFixed(2)), quantidade: retiradasTrans.length },
      apostas: { valor: Number(resultadoApostas.toFixed(2)), quantidade: apostasResolvidas.length },
      pendentes: { valor: Number(valorPendentes.toFixed(2)), quantidade: apostasPendentes.length },
      saldo_atual: Number(casasTotal.toFixed(2)),
      banco: {
        saldo: Number(banca.saldoBanco.toFixed(2)),
        aporte_inicial: Number(banca.valorInicial.toFixed(2)),
        capital_aportado: Number((banca.valorInicial + aportesVal).toFixed(2)),
        aportes_total: Number(aportesVal.toFixed(2)),
        retiradas_total: Number(retiradasVal.toFixed(2)),
        saiu_depositos: Number(depositosVal.toFixed(2)),
        entrou_saques: Number(saquesVal.toFixed(2)),
      },
      casas_total: Number(casasTotal.toFixed(2)),
      banca_total: Number(bancaTotal.toFixed(2)),
      contas: banca.contas.map((c) => ({
        id: c.id,
        nomeCasa: c.nomeCasa,
        saldoAtual: Number(c.saldoAtual.toFixed(2)),
      })),
      transacoesRecentes: banca.transacoes.slice(-10).reverse(),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro em /api/internal/financial/widgets:", error);
    return NextResponse.json({ error: "Erro ao buscar dados financeiros" }, { status: 500 });
  }
}
