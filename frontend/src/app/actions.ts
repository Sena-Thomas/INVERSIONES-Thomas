'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ==========================================
// HELPER: Obtener userId verificado
// ==========================================
async function getAuthUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('No autenticado');
  }
  return session.user.id;
}

// ==========================================
// GET: Cargar todos los datos del dashboard
// ==========================================
export async function getDashboardData() {
  const userId = await getAuthUserId();

  // Busca o crea el perfil del usuario con saldo inicial de $0
  let profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.userProfile.create({
      data: { userId, liquidBalance: 0 },
    });
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 20,
  });

  const investments = await prisma.investment.findMany({
    where: { userId },
    include: { history: { orderBy: { date: 'asc' } } },
  });

  return {
    liquidBalance: profile.liquidBalance,
    transactions,
    investments,
  };
}

// ==========================================
// POST: Registrar ingreso o gasto en billetera
// ==========================================
export async function registerTransaction(data: {
  amount: number;
  type: 'IN' | 'OUT';
  description: string;
}) {
  const userId = await getAuthUserId();

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Perfil no encontrado');

  if (data.type === 'OUT' && data.amount > profile.liquidBalance) {
    throw new Error('Fondos insuficientes');
  }

  const newBalance =
    data.type === 'IN'
      ? profile.liquidBalance + data.amount
      : profile.liquidBalance - data.amount;

  const [updatedProfile, newTx] = await prisma.$transaction([
    prisma.userProfile.update({
      where: { userId },
      data: { liquidBalance: newBalance },
    }),
    prisma.walletTransaction.create({
      data: {
        userId,
        amount: data.amount,
        type: data.type,
        description: data.description,
      },
    }),
  ]);

  return { liquidBalance: updatedProfile.liquidBalance, transaction: newTx };
}

// ==========================================
// POST: Crear nueva inversión (descuenta de billetera)
// ==========================================
export async function createInvestment(data: {
  name: string;
  category: 'PASIVA' | 'ACTIVA';
  color: string;
  initialAmount: number;
  isLiquid: boolean;
  minBalance: number;
}) {
  const userId = await getAuthUserId();

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Perfil no encontrado');

  if (data.initialAmount > profile.liquidBalance) {
    throw new Error('No tienes suficiente liquidez para esta inversión');
  }

  const [updatedProfile, newInvestment] = await prisma.$transaction([
    prisma.userProfile.update({
      where: { userId },
      data: { liquidBalance: profile.liquidBalance - data.initialAmount },
    }),
    prisma.investment.create({
      data: {
        userId,
        name: data.name,
        category: data.category,
        color: data.color,
        initialAmount: data.initialAmount,
        currentAmount: data.initialAmount,
        isLiquid: data.isLiquid,
        minBalance: data.minBalance,
        history: {
          create: { value: data.initialAmount },
        },
      },
      include: { history: true },
    }),
  ]);

  return {
    liquidBalance: updatedProfile.liquidBalance,
    investment: newInvestment,
  };
}

// ==========================================
// PUT: Actualizar saldo de inversión (inyectar o retirar)
// ==========================================
export async function updateInvestment(data: {
  investmentId: string;
  amount: number;
  type: 'ADD' | 'WITHDRAW';
}) {
  const userId = await getAuthUserId();

  const investment = await prisma.investment.findFirst({
    where: { id: data.investmentId, userId },
  });
  if (!investment) throw new Error('Inversión no encontrada');

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Perfil no encontrado');

  let newInvestmentAmount = investment.currentAmount;
  let newLiquidBalance = profile.liquidBalance;

  if (data.type === 'WITHDRAW') {
    if (!investment.isLiquid) {
      throw new Error(`Este fondo (${investment.name}) no es líquido. No puedes retirar.`);
    }
    if (
      investment.minBalance > 0 &&
      newInvestmentAmount - data.amount < investment.minBalance
    ) {
      throw new Error(
        `Límite alcanzado. El fondo exige saldo mínimo de $${investment.minBalance}.`
      );
    }
    newInvestmentAmount -= data.amount;
    newLiquidBalance += data.amount;
  } else {
    if (data.amount > profile.liquidBalance) {
      throw new Error('No tienes suficiente liquidez para inyectar a este fondo.');
    }
    newInvestmentAmount += data.amount;
    newLiquidBalance -= data.amount;
  }

  const [updatedProfile, updatedInvestment] = await prisma.$transaction([
    prisma.userProfile.update({
      where: { userId },
      data: { liquidBalance: newLiquidBalance },
    }),
    prisma.investment.update({
      where: { id: data.investmentId },
      data: {
        currentAmount: newInvestmentAmount,
        history: { create: { value: newInvestmentAmount } },
      },
      include: { history: { orderBy: { date: 'asc' } } },
    }),
  ]);

  return {
    liquidBalance: updatedProfile.liquidBalance,
    investment: updatedInvestment,
  };
}

// ==========================================
// PUT: Actualizar color de inversión
// ==========================================
export async function updateInvestmentColor(investmentId: string, color: string) {
  const userId = await getAuthUserId();

  const investment = await prisma.investment.findFirst({
    where: { id: investmentId, userId },
  });
  if (!investment) throw new Error('Inversión no encontrada');

  await prisma.investment.update({
    where: { id: investmentId },
    data: { color },
  });
}

// ==========================================
// DELETE: Cerrar inversión (devuelve saldo a billetera)
// ==========================================
export async function deleteInvestment(investmentId: string) {
  const userId = await getAuthUserId();

  const investment = await prisma.investment.findFirst({
    where: { id: investmentId, userId },
  });
  if (!investment) throw new Error('Inversión no encontrada');

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Perfil no encontrado');

  await prisma.$transaction([
    prisma.userProfile.update({
      where: { userId },
      data: { liquidBalance: profile.liquidBalance + investment.currentAmount },
    }),
    prisma.investment.delete({ where: { id: investmentId } }),
  ]);

  return { liquidBalance: profile.liquidBalance + investment.currentAmount };
}
