import { NextRequest } from "next/server";
import { handle, json, readJson, requireUser, sameOrigin } from "@/lib/auth/http";
import { objectInput } from "@/lib/auth/security";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const sessionUser = await requireUser(req);
    const bancas = await prisma.banca.findMany({
      where: { userId: sessionUser.id },
      include: {
        contas: true,
        transacoes: true,
        apostas: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const result = bancas.map((banca) => {
      // Calcular saldo nas casas
      const saldoCasas = banca.contas.reduce((acc, c) => acc + (c.saldoAtual || 0), 0);

      // Calcular aportes e retiradas
      const aportes = banca.transacoes
        .filter((t) => t.tipo === "APORTE")
        .reduce((acc, t) => acc + t.valor, 0);

      const retiradas = banca.transacoes
        .filter((t) => t.tipo === "RETIRADA")
        .reduce((acc, t) => acc + t.valor, 0);

      // Calcular resultado das apostas resolvidas
      const resultadoApostas = banca.apostas
        .filter((a) => a.status !== "PENDENTE")
        .reduce((acc, a) => acc + (a.lucroPrejuizo || 0), 0);

      // Apostas pendentes (stake investida que ainda não retornou)
      const pendentes = banca.apostas
        .filter((a) => a.status === "PENDENTE")
        .reduce((acc, a) => acc + a.stake, 0);

      const saldoBanco = banca.saldoBanco;
      const saldoTotal = saldoBanco + saldoCasas;

      return {
        id: banca.id,
        nome: banca.nome,
        descricao: banca.descricao,
        cor: banca.cor,
        valor_inicial: banca.valorInicial.toFixed(2),
        unidade_efetiva: banca.unidadeEfetiva,
        unidade_origem: "padrao",
        ativa: banca.ativa,
        selected: banca.padrao,
        default: banca.padrao,
        compartilhamento: banca.compartilhada,
        apostas_count: banca.apostas.length,
        caixa: {
          banco: Number(saldoBanco.toFixed(2)),
          casas: Number(saldoCasas.toFixed(2)),
          total: Number(saldoTotal.toFixed(2)),
          capital_aportado: Number((banca.valorInicial + aportes).toFixed(2)),
          aportes: Number(aportes.toFixed(2)),
          retiradas: Number(retiradas.toFixed(2)),
          resultado: Number(resultadoApostas.toFixed(2)),
          pendentes: Number(pendentes.toFixed(2)),
        },
        views: {
          hoje: 0,
          semana: 0,
          mes: 0,
          total: 0,
        },
      };
    });

    return json(result);
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const sessionUser = await requireUser(req);
    sameOrigin(req);
    const body = objectInput(await readJson(req), ["nome","descricao","cor","valorInicial","unidadeEfetiva","padrao"]) as Record<string, any>;
    const { nome, descricao, cor, valorInicial, unidadeEfetiva, padrao } = body;

    if (!nome) {
      return json({ error: "Nome da banca é obrigatório" }, 400);
    }

    const user = sessionUser;
    if (!user) {
      return json({ error: "Usuário não encontrado" }, 404);
    }

    const valorInit = parseFloat(valorInicial) || 1000.0;
    const unitEff = parseFloat(unidadeEfetiva) || valorInit * 0.01;

    // Se a nova banca for definida como padrão, desmarcar as outras
    if (padrao) {
      await prisma.banca.updateMany({
        where: { userId: user.id },
        data: { padrao: false },
      });
    }

    const novaBanca = await prisma.banca.create({
      data: {
        userId: user.id,
        nome,
        descricao: descricao || "",
        cor: cor || "#3b82f6",
        valorInicial: valorInit,
        saldoBanco: valorInit,
        unidadeEfetiva: unitEff,
        padrao: Boolean(padrao),
        ativa: true,
      },
    });

    // Registrar o aporte inicial
    await prisma.transacao.create({
      data: {
        bancaId: novaBanca.id,
        tipo: "APORTE",
        valor: valorInit,
        descricao: "Aporte Inicial",
      },
    });

    // Criar casas padrão
    await prisma.contaBookmaker.createMany({
      data: [
        { bancaId: novaBanca.id, nomeCasa: "Bet365", saldoAtual: 0.0 },
        { bancaId: novaBanca.id, nomeCasa: "Betano", saldoAtual: 0.0 },
      ],
    });

    return json(novaBanca, 201);
  });
}
