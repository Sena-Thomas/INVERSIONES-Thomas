"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import {
  Activity, Wallet, TrendingDown, TrendingUp, Plus, Minus, Search,
  PieChart as PieChartIcon, MessageSquare, Zap, Send, ShieldAlert, CheckCircle2
} from "lucide-react";

// ==========================================
// 🧬 1. TIPOS Y ESTRUCTURAS DE DATOS (AZURE READY)
// ==========================================

// Billetera (Gastos/Ingresos líquidos)
interface WalletTransaction {
  id: string;
  amount: number;
  type: "IN" | "OUT";
  description: string;
  date: string;
}

// Inversiones (Pasivas, Activas, Dafuturo, ETFs)
interface Investment {
  id: string;
  name: string;
  category: "PASIVA" | "ACTIVA";
  color: string;
  initialAmount: number;
  currentAmount: number;
  minBalance: number; // Ej: 200k para Dafuturo
  isLiquid: boolean; // Si se puede sacar plata facil (Verde/Rojo)
  history: { date: string, value: number }[];
}

interface MarketAsset {
  symbol: string;
  name: string;
  type: "ETF" | "STOCK";
  description: string;
  suggestedColor: string;
  sector: string;
}

const MARKET_CATALOG: MarketAsset[] = [
  { symbol: "SPY", name: "S&P 500 ETF (SPDR)", type: "ETF", description: "Replica los 500 mayores de EEUU. Diversificación máxima.", suggestedColor: "#00f0ff", sector: "Índice" },
  { symbol: "QQQ", name: "NASDAQ 100 (Invesco)", type: "ETF", description: "Las 100 más grandes tecnológicas del NASDAQ.", suggestedColor: "#7000ff", sector: "Tecnología" },
  { symbol: "VTI", name: "Total Market (Vanguard)", type: "ETF", description: "Todo el mercado accionario americano.", suggestedColor: "#00ffaa", sector: "Índice" },
  { symbol: "ARKK", name: "ARK Innovation ETF", type: "ETF", description: "Empresas de disrupción e innovación.", suggestedColor: "#ff6600", sector: "Innovación" },
  { symbol: "GLD", name: "Gold ETF (SPDR)", type: "ETF", description: "Respaldado por oro físico. Refugio de valor.", suggestedColor: "#ffd700", sector: "Materias Primas" },
  { symbol: "IBIT", name: "Bitcoin ETF (iShares)", type: "ETF", description: "Exposición a Bitcoin sin custodiar. BlackRock.", suggestedColor: "#f7931a", sector: "Cripto" },
  { symbol: "VWO", name: "Emerging Markets (Vanguard)", type: "ETF", description: "China, India, Brasil, Corea y más.", suggestedColor: "#ff4488", sector: "Global" },
  { symbol: "AAPL", name: "Apple Inc.", type: "STOCK", description: "iPhone, Mac, servicios de suscripción.", suggestedColor: "#aaaaaa", sector: "Tecnología" },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "STOCK", description: "Azure, IA con OpenAI, Office 365.", suggestedColor: "#00a4ef", sector: "Tecnología" },
  { symbol: "GOOGL", name: "Alphabet (Google)", type: "STOCK", description: "Ads, Gemini AI, Google Cloud.", suggestedColor: "#fbbc04", sector: "Tecnología" },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "STOCK", description: "GPUs para IA, Data Centers, Gaming.", suggestedColor: "#76b900", sector: "Semiconductores" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "STOCK", description: "E-commerce #1, AWS cloud líder.", suggestedColor: "#ff9900", sector: "Tecnología" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "STOCK", description: "Vehículos eléctricos, Robotaxis, IA.", suggestedColor: "#e82127", sector: "Automoción" },
  { symbol: "META", name: "Meta Platforms", type: "STOCK", description: "Facebook, Instagram, WhatsApp, Llama AI.", suggestedColor: "#0866ff", sector: "Redes Sociales" },
  { symbol: "BRK.B", name: "Berkshire Hathaway B", type: "STOCK", description: "El portafolio de Warren Buffett.", suggestedColor: "#c8a96e", sector: "Holding" },
];

export default function NexusWallstreetSaaS() {
  // ==========================================
  // 🧭 2. ESTADOS GLOBALES DE LA APLICACIÓN
  // ==========================================
  const [activeTab, setActiveTab] = useState("mi_estado");

  // ==========================================
  // 💰 3. ESTADOS: "MI ESTADO" (BILLETERA LÍQUIDA)
  // ==========================================
  const [liquidWallet, setLiquidWallet] = useState<number>(300000);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  // Controles de la Billetera
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txType, setTxType] = useState<"IN" | "OUT">("OUT");

  // ==========================================
  // 📊 4. ESTADOS: "INVERSIONES"
  // ==========================================
  const [investments, setInvestments] = useState<Investment[]>([
    {
      id: "daf-1", name: "Dafuturo Davivienda", category: "PASIVA", color: "#ff0055",
      initialAmount: 500000, currentAmount: 505000, minBalance: 200000, isLiquid: true,
      history: [{ date: '2023-01-01', value: 500000 }, { date: '2023-02-01', value: 505000 }]
    }
  ]);

  // Controles del Módulo de Inversiones (FAB y Modal)
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [invFormType, setInvFormType] = useState<"PASIVA" | "ACTIVA">("PASIVA");
  const [newInvName, setNewInvName] = useState("");
  const [newInvAmount, setNewInvAmount] = useState("");
  const [newInvColor, setNewInvColor] = useState("#00f0ff");
  const [newInvLiquid, setNewInvLiquid] = useState(true);
  const [newInvMinBalance, setNewInvMinBalance] = useState("0");
  const [expandedInvId, setExpandedInvId] = useState<string | null>(null);

  // Search module states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<"ALL" | "ETF" | "STOCK">("ALL");

  // Investment custom update state (per-investment input)
  const [invUpdateAmounts, setInvUpdateAmounts] = useState<Record<string, string>>({});

  // ==========================================
  // 🧮 5. MOTOR DE CÁLCULO (LA MAGIA MATEMÁTICA)
  // ==========================================

  const totalInvestedValue = useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.currentAmount, 0);
  }, [investments]);

  // EL CAPITAL NETO INTOCABLE
  const NET_CAPITAL = liquidWallet + totalInvestedValue;

  // ==========================================
  // ⚙️ 6. LÓGICA DE NEGOCIO (BILLETERA E INVERSIONES)
  // ==========================================

  // Manejo de Billetera (Gastos Hormiga / Ingresos)
  const handleTransaction = () => {
    const amount = Number(txAmount);
    if (!amount || amount <= 0) return;

    if (txType === "OUT" && amount > liquidWallet) {
      alert("¡Fondos líquidos insuficientes bro! Revisa tus inversiones.");
      return;
    }

    const newTx: WalletTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      amount: amount,
      type: txType,
      description: txDesc || (txType === "IN" ? "Ingreso Extra" : "Gasto / Hormiga"),
      date: new Date().toISOString()
    };

    setLiquidWallet(prev => txType === "IN" ? prev + amount : prev - amount);
    setTransactions(prev => [newTx, ...prev]);
    setTxAmount(""); setTxDesc("");
  };

  // Crear Inversión (Saca de billetera, mete a fondo)
  const handleCreateInvestment = () => {
    const amount = Number(newInvAmount);
    if (!newInvName || amount <= 0) return;

    if (amount > liquidWallet) {
      alert("¡No tienes suficiente liquidez en tu Billetera para hacer esta inversión!");
      return;
    }

    setLiquidWallet(prev => prev - amount);

    const newInvestment: Investment = {
      id: Math.random().toString(36).substr(2, 9),
      name: newInvName,
      category: invFormType,
      color: newInvColor,
      initialAmount: amount,
      currentAmount: amount,
      isLiquid: newInvLiquid,
      minBalance: Number(newInvMinBalance),
      history: [{ date: new Date().toISOString().split('T')[0], value: amount }]
    };

    setInvestments([...investments, newInvestment]);
    setIsInvModalOpen(false);
    setNewInvName(""); setNewInvAmount(""); setNewInvMinBalance("0");
  };

  // Actualizar Inversión (Validación de Dafuturo 200k)
  const handleUpdateInvestmentAmount = (invId: string, amountToChange: number, type: "ADD" | "WITHDRAW") => {
    setInvestments(investments.map(inv => {
      if (inv.id === invId) {
        let newCurrent = inv.currentAmount;

        if (type === "WITHDRAW") {
          if (!inv.isLiquid) {
            alert(`¡Alerta! Este fondo (${inv.name}) no es líquido (Ej: CDT). No puedes retirar.`);
            return inv;
          }
          if (inv.minBalance > 0 && (newCurrent - amountToChange) < inv.minBalance) {
            alert(`¡Límite alcanzado! El fondo exige saldo mínimo de $${inv.minBalance}. Solo puedes retirar hasta $${newCurrent - inv.minBalance}`);
            return inv;
          }
          newCurrent -= amountToChange;
          setLiquidWallet(prev => prev + amountToChange);
        } else {
          if (amountToChange > liquidWallet) {
            alert("No tienes tanta liquidez para inyectarle a este fondo.");
            return inv;
          }
          newCurrent += amountToChange;
          setLiquidWallet(prev => prev - amountToChange);
        }

        const newHistory = [...inv.history, { date: new Date().toISOString().split('T')[0], value: newCurrent }];
        return { ...inv, currentAmount: newCurrent, history: newHistory };
      }
      return inv;
    }));
  };

  const handleDeleteInvestment = (inv: Investment) => {
    if (confirm(`¿Cerrar ${inv.name}? Tu saldo de $${inv.currentAmount} volverá a tu Billetera.`)) {
      setLiquidWallet(prev => prev + inv.currentAmount);
      setInvestments(investments.filter(i => i.id !== inv.id));
    }
  };

  const macroHistoryData = [
    { name: 'Ene', neto: 900000, gastos: 150000 },
    { name: 'Feb', neto: 1050000, gastos: 120000 },
    { name: 'Mar', neto: 1120000, gastos: 200000 },
    { name: 'Abr', neto: NET_CAPITAL, gastos: transactions.filter(t => t.type === 'OUT').reduce((s, t) => s + t.amount, 0) },
  ];

  const comparativeData = investments.map(inv => ({
    name: inv.name,
    rentabilidad: inv.currentAmount - inv.initialAmount,
    fill: inv.color
  }));

  // ==========================================
  // 🖥️ 7. RENDERIZADOS DE MÓDULOS
  // ==========================================

  const renderMiEstado = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* LIQUIDEZ */}
        <div className="bg-[#0A0A16]/80 border border-[#7000ff]/30 p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-xs text-gray-400 uppercase tracking-widest flex items-center gap-2"><Wallet size={16} className="text-[#7000ff]" /> Liquidez (Billetera)</h3>
          </div>
          <p className="text-3xl font-bold text-white mt-4">${liquidWallet.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 mt-1">Dinero disponible (Tu 15%)</p>
        </div>

        {/* EN INVERSIONES */}
        <div className="bg-[#0A0A16]/80 border border-[#00f0ff]/30 p-6 rounded-2xl flex flex-col justify-between">
          <h3 className="text-xs text-gray-400 uppercase tracking-widest flex items-center gap-2"><PieChartIcon size={16} className="text-[#00f0ff]" /> En Inversiones</h3>
          <p className="text-3xl font-bold text-white mt-4">${totalInvestedValue.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 mt-1">Suma de Pasivas y Activas</p>
        </div>

        {/* GASTOS HORMIGA / INGRESOS */}
        <div className="bg-[#05050A] border border-white/10 p-4 rounded-2xl flex flex-col gap-3">
          <h3 className="text-[10px] text-gray-400 uppercase tracking-widest text-center">Registrar Movimiento Líquido</h3>
          <div className="flex gap-2">
            <button onClick={() => setTxType("IN")} className={`flex-1 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-1 transition-all ${txType === "IN" ? "bg-[#00ffaa]/20 text-[#00ffaa] border border-[#00ffaa]/50" : "bg-[#0A0A16] text-gray-500"}`}><Plus size={14} /> Ingreso</button>
            <button onClick={() => setTxType("OUT")} className={`flex-1 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-1 transition-all ${txType === "OUT" ? "bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055]/50" : "bg-[#0A0A16] text-gray-500"}`}><Minus size={14} /> Gasto</button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-gray-500 text-xs">$</span>
              <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0.00" className="w-full bg-[#0A0A16] border border-white/10 rounded-lg py-2 pl-6 pr-2 text-xs text-white outline-none focus:border-[#00f0ff]" />
            </div>
            <input type="text" value={txDesc} onChange={(e) => setTxDesc(e.target.value)} placeholder="Nota (Opcional)" className="flex-1 bg-[#0A0A16] border border-white/10 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-[#00f0ff]" />
          </div>
          <button onClick={handleTransaction} className="w-full bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest">Registrar a Billetera</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0A0A16]/90 border border-white/10 p-6 rounded-2xl h-[350px]">
          <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-6">Crecimiento Neto vs Gastos Mensuales</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={macroHistoryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNeto" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#00f0ff" stopOpacity={0} /></linearGradient>
                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff0055" stopOpacity={0.3} /><stop offset="95%" stopColor="#ff0055" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff30" fontSize={10} />
              <YAxis stroke="#ffffff30" fontSize={10} tickFormatter={(val) => `$${val / 1000}k`} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#05050A', borderColor: '#333' }} formatter={(val: number) => `$${val.toLocaleString()}`} />
              <Area type="monotone" dataKey="neto" stroke="#00f0ff" fillOpacity={1} fill="url(#colorNeto)" name="Capital Neto" />
              <Area type="monotone" dataKey="gastos" stroke="#ff0055" fillOpacity={1} fill="url(#colorGastos)" name="Gastos/Hormiga" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#0A0A16]/90 border border-white/10 p-6 rounded-2xl h-[350px] flex flex-col">
          <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-4">Últimos Movimientos</h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {transactions.length === 0 ? (
              <p className="text-gray-600 text-xs text-center mt-10">No hay movimientos recientes.</p>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div>
                    <p className="text-xs text-white">{tx.description}</p>
                    <p className="text-[9px] text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-bold ${tx.type === 'IN' ? 'text-[#00ffaa]' : 'text-[#ff0055]'}`}>
                    {tx.type === 'IN' ? '+' : '-'}${tx.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* DISTRIBUCIÓN DE CAPITAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0A0A16]/90 border border-white/10 p-6 rounded-2xl h-[300px]">
          <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-4">Distribución del Capital</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={[
                  { name: "Liquidez", value: liquidWallet, fill: "#7000ff" },
                  { name: "Inv. Pasivas", value: investments.filter(i => i.category === "PASIVA").reduce((s,i) => s + i.currentAmount, 0), fill: "#ff0055" },
                  { name: "Inv. Activas", value: investments.filter(i => i.category === "ACTIVA").reduce((s,i) => s + i.currentAmount, 0), fill: "#00f0ff" },
                ].filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {/* Cell colors are already in fill props */}
              </Pie>
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#05050A', borderColor: '#333', fontSize: '12px' }}
                formatter={(val: number) => `$${val.toLocaleString()}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* RECOMENDACIONES */}
        <div className="bg-[#0A0A16]/90 border border-white/10 p-6 rounded-2xl">
          <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap size={14} className="text-[#ffd700]" /> Radar de Oportunidades
          </h3>
          <div className="space-y-3">
            {[
              { icon: "🏆", title: "S&P 500 (SPY)", desc: "Históricamente +10% anual promedio. Base sólida para cualquier portafolio.", tag: "ETF Seguro" },
              { icon: "⚡", title: "NVIDIA (NVDA)", desc: "Líder indiscutible en chips para IA. Alto riesgo, altísima recompensa.", tag: "Alto Potencial" },
              { icon: "🔒", title: "Dafuturo (CDT a la vista)", desc: "Liquidez inmediata con rentabilidad fija. Ideal para tu fondo de emergencia.", tag: "Inversión Pasiva" },
              { icon: "🌍", title: "VWO (Emergentes)", desc: "Mercados en crecimiento: India, China, Brasil. Diversificación global.", tag: "Diversificación" },
            ].map((rec, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-[#05050A] border border-white/5 hover:border-white/10 transition-all">
                <span className="text-xl">{rec.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-white">{rec.title}</p>
                    <span className="text-[8px] px-2 py-0.5 rounded bg-[#7000ff]/20 text-[#7000ff] border border-[#7000ff]/30 whitespace-nowrap ml-2">{rec.tag}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{rec.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // 🖥️ 8. RENDER: MÓDULO "INVERSIONES"
  // ==========================================
  const renderInversiones = () => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 relative">

      {/* HEADER DEL MÓDULO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-widest uppercase">Portafolio Activo</h2>
          <p className="text-xs text-gray-500">Gestión de Fondos Pasivos y Activos</p>
        </div>
        <div className="bg-[#0A0A16] px-4 py-2 rounded-lg border border-[#00f0ff]/20">
          <p className="text-[10px] text-gray-400 uppercase">Total en Inversiones</p>
          <p className="text-xl font-bold text-[#00f0ff]">${totalInvestedValue.toLocaleString()}</p>
        </div>
      </div>

      {/* CUADRÍCULA DE INVERSIONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {investments.length === 0 ? (
          <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl">
            <p className="text-gray-500">No tienes inversiones activas. Dale al botón + para crear una.</p>
          </div>
        ) : (
          investments.map((inv) => (
            <div
              key={inv.id}
              className="bg-[#0A0A16]/90 p-5 rounded-2xl flex flex-col gap-4 border-t-4 shadow-lg transition-all hover:bg-[#0A0A16]"
              style={{ borderTopColor: inv.color, boxShadow: `0 -5px 20px ${inv.color}15` }}
            >
              {/* Cabecera de la Tarjeta */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300 font-bold tracking-widest uppercase">
                    {inv.category}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-2">{inv.name}</h3>
                </div>
                {/* INDICADOR DE LIQUIDEZ */}
                <div className="flex flex-col items-end">
                  {inv.isLiquid ? (
                    <span className="flex items-center gap-1 text-[10px] text-[#00ffaa]"><CheckCircle2 size={12} /> Líquido</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-[#ff0055]"><ShieldAlert size={12} /> Bloqueado</span>
                  )}
                  {inv.minBalance > 0 && <span className="text-[9px] text-gray-500 mt-1">Min: ${inv.minBalance / 1000}k</span>}
                </div>
              </div>

              {/* Saldos */}
              <div className="grid grid-cols-2 gap-4 bg-[#05050A] p-3 rounded-xl border border-white/5">
                <div>
                  <p className="text-[9px] text-gray-500 uppercase">Invertido</p>
                  <p className="text-sm font-mono text-gray-300">${inv.initialAmount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-gray-500 uppercase">Actual</p>
                  <p className="text-sm font-mono font-bold" style={{ color: inv.currentAmount >= inv.initialAmount ? '#00ffaa' : '#ff0055' }}>
                    ${inv.currentAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Botones de Acción (CRUD) */}
              <div className="flex gap-2 mt-auto">
                <button onClick={() => setExpandedInvId(expandedInvId === inv.id ? null : inv.id)} className="flex-1 bg-white/5 hover:bg-white/10 text-xs py-2 rounded-lg transition-all text-gray-300">
                  {expandedInvId === inv.id ? 'Ocultar Gráfica' : 'Ver Detalles'}
                </button>
                <button onClick={() => handleDeleteInvestment(inv)} className="bg-[#ff0055]/10 hover:bg-[#ff0055]/20 border border-[#ff0055]/30 text-[#ff0055] px-3 rounded-lg transition-all">
                  <Minus size={14} />
                </button>
              </div>

              {/* DETALLE EXPANDIDO */}
              <AnimatePresence>
                {expandedInvId === inv.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/10 mt-2 pt-4">
                    <div className="flex gap-2 mb-4 items-center">
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1.5 text-gray-500 text-[10px]">$</span>
                        <input
                          type="number"
                          min="0"
                          value={invUpdateAmounts[inv.id] ?? ""}
                          onChange={(e) => setInvUpdateAmounts(prev => ({ ...prev, [inv.id]: e.target.value }))}
                          placeholder="Monto"
                          className="w-full bg-[#05050A] border border-white/10 rounded-lg py-1.5 pl-5 pr-2 text-[10px] text-white outline-none focus:border-[#00f0ff]"
                        />
                      </div>
                      <button
                        onClick={() => handleUpdateInvestmentAmount(inv.id, Number(invUpdateAmounts[inv.id] || 50000), "ADD")}
                        className="flex-1 bg-[#00ffaa]/10 text-[#00ffaa] border border-[#00ffaa]/30 text-[10px] py-1.5 rounded flex items-center justify-center gap-1"
                      >
                        <Plus size={10} /> Inyectar
                      </button>
                      <button
                        onClick={() => handleUpdateInvestmentAmount(inv.id, Number(invUpdateAmounts[inv.id] || 50000), "WITHDRAW")}
                        className="flex-1 bg-[#ff0055]/10 text-[#ff0055] border border-[#ff0055]/30 text-[10px] py-1.5 rounded flex items-center justify-center gap-1"
                      >
                        <Minus size={10} /> Retirar
                      </button>
                    </div>
                    <div className="h-[120px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={inv.history.length > 0 ? inv.history : [{ date: 'Inicio', value: inv.initialAmount }, { date: 'Hoy', value: inv.currentAmount }]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#05050A', borderColor: '#333', fontSize: '12px' }} formatter={(val: number) => `$${val.toLocaleString()}`} />
                          <Line type="monotone" dataKey="value" stroke={inv.color} strokeWidth={2} dot={{ r: 3, fill: inv.color }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* GRÁFICA COMPARATIVA GLOBAL */}
      {investments.length > 0 && (
        <div className="mt-10 bg-[#0A0A16]/80 p-6 rounded-2xl border border-white/10">
          <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-6">Comparativa de Rentabilidad (Ganancia/Pérdida)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff30" fontSize={10} />
                <YAxis stroke="#ffffff30" fontSize={10} tickFormatter={(val) => `$${val / 1000}k`} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#05050A', borderColor: '#333' }} cursor={{ fill: '#ffffff05' }} formatter={(val: number) => `$${val.toLocaleString()}`} />
                <Bar dataKey="rentabilidad" radius={[4, 4, 0, 0]}>
                  {comparativeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE (FAB) PARA NUEVA INVERSIÓN */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {isFabOpen && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex flex-col gap-2 items-end">
              <button onClick={() => { setInvFormType("PASIVA"); setIsInvModalOpen(true); setIsFabOpen(false); }} className="bg-[#0A0A16] border border-[#ff0055]/50 text-white px-4 py-2 rounded-xl text-xs tracking-widest uppercase hover:bg-[#ff0055]/20 transition-all flex items-center gap-2 shadow-lg">
                <ShieldAlert size={14} className="text-[#ff0055]" /> Pasiva (Dafuturo, CDT)
              </button>
              <button onClick={() => { setInvFormType("ACTIVA"); setIsInvModalOpen(true); setIsFabOpen(false); }} className="bg-[#0A0A16] border border-[#00f0ff]/50 text-white px-4 py-2 rounded-xl text-xs tracking-widest uppercase hover:bg-[#00f0ff]/20 transition-all flex items-center gap-2 shadow-lg">
                <TrendingUp size={14} className="text-[#00f0ff]" /> Activa (Acción, ETF)
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => setIsFabOpen(!isFabOpen)} className={`bg-gradient-to-r ${isFabOpen ? 'from-[#ff0055] to-[#7000ff]' : 'from-[#00f0ff] to-[#7000ff]'} text-white p-4 rounded-full shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-110 transition-all`}>
          <Plus size={24} className={isFabOpen ? "rotate-45 transition-transform" : "transition-transform"} />
        </button>
      </div>

      {/* MODAL DE CREACIÓN DE INVERSIÓN */}
      <AnimatePresence>
        {isInvModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0A0A16] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                <Plus size={18} color={invFormType === "PASIVA" ? "#ff0055" : "#00f0ff"} />
                Nueva Inversión {invFormType}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Nombre / Entidad</label>
                  <input type="text" value={newInvName} onChange={(e) => setNewInvName(e.target.value)} placeholder="Ej: CDT Bancolombia" className="w-full bg-[#05050A] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#00f0ff] outline-none mt-1" />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 uppercase">Monto Inicial (Se resta de Liquidez)</label>
                    <input type="number" value={newInvAmount} onChange={(e) => setNewInvAmount(e.target.value)} placeholder="0.00" className="w-full bg-[#05050A] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#00f0ff] outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">Color</label>
                    <input type="color" value={newInvColor} onChange={(e) => setNewInvColor(e.target.value)} className="w-full h-[46px] bg-[#05050A] border border-white/10 rounded-lg p-1 mt-1 cursor-pointer" />
                  </div>
                </div>

                <div className="bg-[#05050A] p-4 rounded-xl border border-white/5 space-y-4 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white">¿Es Dinero Líquido?</p>
                      <p className="text-[9px] text-gray-500">¿Puedes sacar la plata sin penalización?</p>
                    </div>
                    <button onClick={() => setNewInvLiquid(!newInvLiquid)} className={`w-10 h-5 rounded-full relative transition-colors ${newInvLiquid ? 'bg-[#00ffaa]' : 'bg-gray-700'}`}>
                      <span className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${newInvLiquid ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {newInvLiquid && (
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase">Saldo Mínimo Requerido (Ej: 200k)</label>
                      <input type="number" value={newInvMinBalance} onChange={(e) => setNewInvMinBalance(e.target.value)} placeholder="0 Si no hay límite" className="w-full bg-transparent border-b border-white/10 p-2 text-sm text-white focus:border-[#00f0ff] outline-none mt-1" />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setIsInvModalOpen(false)} className="flex-1 bg-transparent border border-white/20 text-white p-3 rounded-lg text-xs tracking-widest uppercase hover:bg-white/5 transition-all">Cancelar</button>
                  <button onClick={handleCreateInvestment} className="flex-1 bg-[#00f0ff]/10 border border-[#00f0ff]/50 text-[#00f0ff] p-3 rounded-lg text-xs font-bold tracking-widest uppercase hover:bg-[#00f0ff]/20 transition-all">Crear Fondo</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  // ==========================================
  // 🖥️ 9. RENDER: MÓDULO "SEARCH" (Placeholder Parte 3)
  // ==========================================
  const renderSearch = () => {
  const filteredCatalog = MARKET_CATALOG.filter(asset => {
    const matchesQuery = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.sector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = searchFilter === "ALL" || asset.type === searchFilter;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl font-bold text-white tracking-widest uppercase">Buscador de Mercados</h2>
        <p className="text-xs text-gray-500 mt-1">Encuentra ETFs o acciones y crea una inversión activa directamente.</p>
      </div>

      {/* Search Bar + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por símbolo, nombre o sector..."
            className="w-full bg-[#0A0A16] border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none focus:border-[#7000ff] transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(["ALL", "ETF", "STOCK"] as const).map(f => (
            <button
              key={f}
              onClick={() => setSearchFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                searchFilter === f
                  ? "bg-[#7000ff]/20 text-[#7000ff] border border-[#7000ff]/50"
                  : "bg-[#0A0A16] text-gray-500 border border-white/10 hover:border-white/20"
              }`}
            >
              {f === "ALL" ? "Todos" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCatalog.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p>Sin resultados para &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          filteredCatalog.map(asset => {
            const alreadyInPortfolio = investments.some(inv => inv.name.includes(asset.symbol) || inv.name === asset.name);
            return (
              <motion.div
                key={asset.symbol}
                whileHover={{ scale: 1.02 }}
                className="bg-[#0A0A16]/90 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 cursor-pointer hover:border-[#7000ff]/40 transition-all"
                style={{ borderTopColor: asset.suggestedColor, borderTopWidth: 3 }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white font-mono">{asset.symbol}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded border text-gray-400 border-white/10 uppercase tracking-widest">
                        {asset.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{asset.name}</p>
                  </div>
                  <span
                    className="text-[9px] px-2 py-1 rounded-lg border"
                    style={{ color: asset.suggestedColor, borderColor: `${asset.suggestedColor}40`, backgroundColor: `${asset.suggestedColor}10` }}
                  >
                    {asset.sector}
                  </span>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">{asset.description}</p>

                {alreadyInPortfolio ? (
                  <div className="flex items-center gap-2 bg-[#00ffaa]/5 border border-[#00ffaa]/20 rounded-lg px-3 py-2">
                    <CheckCircle2 size={12} className="text-[#00ffaa]" />
                    <span className="text-[10px] text-[#00ffaa]">Ya está en tu portafolio</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setNewInvName(`${asset.name} (${asset.symbol})`);
                      setNewInvColor(asset.suggestedColor);
                      setInvFormType("ACTIVA");
                      setIsInvModalOpen(true);
                      setActiveTab("inversiones");
                    }}
                    className="w-full bg-[#7000ff]/10 hover:bg-[#7000ff]/20 border border-[#7000ff]/30 text-[#7000ff] py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={12} /> Agregar al Portafolio
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

  // ==========================================
  // 🖥️ 10. LAYOUT MAESTRO Y NAVEGACIÓN
  // ==========================================
  return (
    <div className="flex h-screen bg-[#05050A] text-white font-mono overflow-hidden selection:bg-[#00f0ff] selection:text-black">

      {/* 🔮 SIDEBAR (Navegación entre los 3 grandes módulos) */}
      <nav className="w-20 md:w-64 border-r border-white/5 bg-[#0A0A16]/50 p-4 z-20 flex flex-col gap-6">
        <div className="flex items-center gap-3 justify-center md:justify-start mb-8">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00f0ff] to-[#7000ff] flex items-center justify-center font-bold text-black">N</div>
          <span className="hidden md:block font-bold tracking-widest uppercase text-sm">Nexus SaaS</span>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={() => setActiveTab("mi_estado")} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === "mi_estado" ? "bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30" : "text-gray-500 hover:bg-white/5 hover:text-white"}`}>
            <Activity size={18} />
            <span className="hidden md:block text-xs font-bold uppercase tracking-widest">Mi Estado</span>
          </button>

          <button onClick={() => setActiveTab("inversiones")} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === "inversiones" ? "bg-[#ff0055]/10 text-[#ff0055] border border-[#ff0055]/30" : "text-gray-500 hover:bg-white/5 hover:text-white"}`}>
            <PieChartIcon size={18} />
            <span className="hidden md:block text-xs font-bold uppercase tracking-widest">Inversiones</span>
          </button>

          <button onClick={() => setActiveTab("search")} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === "search" ? "bg-[#7000ff]/10 text-[#7000ff] border border-[#7000ff]/30" : "text-gray-500 hover:bg-white/5 hover:text-white"}`}>
            <Search size={18} />
            <span className="hidden md:block text-xs font-bold uppercase tracking-widest">Search ETF</span>
          </button>
        </div>
      </nav>

      {/* 🔮 CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto custom-scrollbar">

        {/* TOPBAR: EL CAPITAL NETO INTOCABLE */}
        <header className="sticky top-0 z-10 bg-[#05050A]/80 backdrop-blur-md border-b border-white/5 p-6 flex justify-between items-center">
          <div>
            <h1 className="text-sm text-gray-400 uppercase tracking-widest">Panel de Control</h1>
            <p className="text-xs text-gray-600">Sincronizado con Azure DB</p>
          </div>

          {/* AQUÍ ESTÁ EL TOTAL: Suma de la billetera + inversiones */}
          <div className="text-right">
            <h2 className="text-[10px] text-gray-500 uppercase tracking-widest">Capital Neto (Intocable)</h2>
            <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#7000ff]">
              ${NET_CAPITAL.toLocaleString()}
            </p>
          </div>
        </header>

        {/* ÁREA DE RENDERIZADO DINÁMICO */}
        <div className="p-6 md:p-10">
          {activeTab === "mi_estado" && renderMiEstado()}
          {activeTab === "inversiones" && renderInversiones()}
          {activeTab === "search" && renderSearch()}
        </div>
      </main>

    </div>
  );
}