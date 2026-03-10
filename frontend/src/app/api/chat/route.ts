import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI, GoogleGenerativeAIError } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    // 1. Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = session.user.id;
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensaje inválido' }, { status: 400 });
    }

    // 2. Obtener contexto financiero real del usuario desde la BD
    const [profile, transactions, investments] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      prisma.investment.findMany({ where: { userId } }),
    ]);

    const totalInvested = investments.reduce((s, i) => s + i.currentAmount, 0);
    const totalGastos = transactions
      .filter((t) => t.type === 'OUT')
      .reduce((s, t) => s + t.amount, 0);
    const totalIngresos = transactions
      .filter((t) => t.type === 'IN')
      .reduce((s, t) => s + t.amount, 0);

    const financialContext = `
Estado financiero actual del usuario (${session.user.name ?? 'Usuario'}):
- Saldo líquido en billetera: $${profile?.liquidBalance?.toLocaleString() ?? 0}
- Total invertido (pasivo + activo): $${totalInvested.toLocaleString()}
- Capital neto total: $${((profile?.liquidBalance ?? 0) + totalInvested).toLocaleString()}
- Últimos gastos (últimas 10 transacciones): $${totalGastos.toLocaleString()}
- Últimos ingresos (últimas 10 transacciones): $${totalIngresos.toLocaleString()}
- Número de inversiones activas: ${investments.length}
- Inversiones:
${investments.map((i) => `  * ${i.name} (${i.category}): Invertido $${i.initialAmount.toLocaleString()}, Actual $${i.currentAmount.toLocaleString()}, Ganancia: $${(i.currentAmount - i.initialAmount).toLocaleString()}`).join('\n')}
`;

    // 3. Llamar al proveedor de IA con el contexto financiero
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          reply: `Hola ${session.user.name ?? 'usuario'}! Soy tu asesor financiero IA. Actualmente no tengo acceso a un proveedor de IA configurado (falta GEMINI_API_KEY), pero puedo ver tu contexto financiero:\n\n${financialContext}\n\nConfigura tu GEMINI_API_KEY en .env para respuestas inteligentes.`,
        }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `Eres un asesor financiero personal experto en inversiones, ahorro y optimización de gastos para el mercado latinoamericano (especialmente Colombia). Responde siempre en español, de forma concisa y con emojis financieros. Usa el contexto financiero real del usuario para dar consejos personalizados.\n\n${financialContext}`,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { maxOutputTokens: 500 },
    });

    const reply = result.response?.text() ?? 'Sin respuesta del modelo.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error en API Chat:', error);
    const message =
      error instanceof GoogleGenerativeAIError
        ? error.message
        : 'Error interno del servidor. Revisa los logs para más detalles.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
