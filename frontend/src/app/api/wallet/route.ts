import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Traer tu saldo líquido y últimos movimientos
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        let profile = await prisma.userProfile.findUnique({ where: { userId } });
        if (!profile) {
            profile = await prisma.userProfile.create({ data: { userId, liquidBalance: 0 } });
        }

        const transactions = await prisma.walletTransaction.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: 20
        });

        return NextResponse.json({ liquidBalance: profile.liquidBalance, transactions });
    } catch (error) {
        console.error("Error en GET /api/wallet:", error);
        return NextResponse.json({ error: "Error conectando a la BD" }, { status: 500 });
    }
}

// POST: Registrar nuevo ingreso o gasto
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const body = await req.json();
        const { amount, type, description } = body;

        const profile = await prisma.userProfile.findUnique({ where: { userId } });
        if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

        if (type === "OUT" && amount > profile.liquidBalance) {
            return NextResponse.json({ error: "Fondos insuficientes" }, { status: 400 });
        }

        const newBalance = type === "IN" ? profile.liquidBalance + amount : profile.liquidBalance - amount;

        const [updatedProfile, newTx] = await prisma.$transaction([
            prisma.userProfile.update({
                where: { userId },
                data: { liquidBalance: newBalance }
            }),
            prisma.walletTransaction.create({
                data: { userId, amount: Number(amount), type, description }
            })
        ]);

        return NextResponse.json({ success: true, liquidBalance: updatedProfile.liquidBalance, transaction: newTx });
    } catch (error) {
        console.error("Error en POST /api/wallet:", error);
        return NextResponse.json({ error: "Error guardando transacción" }, { status: 500 });
    }
}