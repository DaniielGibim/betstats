import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      include: {
        telegramAccount: true,
        assinatura: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Contar apostas feitas hoje para calcular o consumo
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const apostasHoje = await prisma.aposta.count({
      where: {
        createdAt: {
          gte: startOfToday,
        },
      },
    });

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      slug: user.slug,
      avatar_url: user.avatarUrl,
      has_password: Boolean(user.passwordHash),
      google_linked: false,
      auto_settle: user.autoSettle,
      deteccao_casa: user.deteccaoCasa,
      permissions: [],
      userTelegram: user.telegramAccount
        ? {
            id: user.telegramAccount.id,
            name: user.telegramAccount.name,
            id_telegram: user.telegramAccount.telegramId,
            username: user.telegramAccount.username,
            codigoVinculo: user.telegramAccount.codigoVinculo,
          }
        : null,
      assinatura: user.assinatura
        ? {
            id: user.assinatura.id,
            status: user.assinatura.status,
            plan: {
              id: user.assinatura.plan.id,
              name: user.assinatura.plan.name,
              price: user.assinatura.plan.price.toFixed(2),
              features: [
                {
                  feature_key: "apostas",
                  limit: user.assinatura.plan.limiteApostas,
                  limit_period: "day",
                },
                {
                  feature_key: "tips",
                  limit: user.assinatura.plan.limiteTips,
                  limit_period: "day",
                },
              ],
            },
            usages: [
              {
                feature_key: "apostas",
                consumed: apostasHoje,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              },
            ],
          }
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro em /api/internal/me:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
