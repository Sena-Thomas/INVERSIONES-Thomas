import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Traer todas las inversiones con su historial para las gráficas
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const investments = await prisma.investment.findMany({
            where: { userId },
            include: {
                history: { orderBy: { date: 'asc' } }
            }
        });
        return NextResponse.json(investments);
    } catch (error) {
        console.error("Error en GET /api/investments:", error);
        return NextResponse.json({ error: "Error obteniendo inversiones" }, { status: 500 });
    }
}

// POST: Crear una nueva inversión (Ej: CDT o S&P 500)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const body = await req.json();
        const { name, category, color, initialAmount, isLiquid, minBalance } = body;

        const newInvestment = await prisma.investment.create({
            data: {
                userId,
                name,
                category,
                color,
                initialAmount: Number(initialAmount),
                currentAmount: Number(initialAmount),
                isLiquid,
                minBalance: Number(minBalance),
                history: {
                    create: { value: Number(initialAmount) }
                }
            },
            include: { history: true }
        });

        return NextResponse.json(newInvestment);
    } catch (error) {
        console.error("Error en POST /api/investments:", error);
        return NextResponse.json({ error: "Error creando inversión" }, { status: 500 });
    }
}

// PUT: Actualizar saldo de inversión (Inyectar o Retirar plata de un fondo)
export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const body = await req.json();
        const { id, newAmount } = body;

        // Verificar que la inversión pertenece al usuario
        const existing = await prisma.investment.findFirst({ where: { id, userId } });
        if (!existing) return NextResponse.json({ error: "Inversión no encontrada" }, { status: 404 });

        const updatedInvestment = await prisma.investment.update({
            where: { id },
            data: {
                currentAmount: Number(newAmount),
                history: {
                    create: { value: Number(newAmount) }
                }
            },
            include: { history: true }
        });

        return NextResponse.json(updatedInvestment);
    } catch (error) {
        console.error("Error en PUT /api/investments:", error);
        return NextResponse.json({ error: "Error actualizando fondo" }, { status: 500 });
    }
}