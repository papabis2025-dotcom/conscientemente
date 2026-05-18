import React, { useState, useEffect, useMemo } from 'react';
import { LayoutTemplate, Wallet, TrendingUp, TrendingDown, CreditCard, ChevronLeft, ChevronRight, Trash2, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

type TransactionType = 'entrada' | 'saida';

interface Transaction {
  id: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  dayOnly?: boolean;
  name: string;
  amount: number;
  category: string;
  paymentMethod?: string;
  pending?: boolean;
}

const ENTRADA_CATEGORIES = ['Trabalho', 'Outros', 'Investimentos', 'Extra', 'Cashback', 'Reserva', 'Residual'];
const SAIDA_CATEGORIES = [
  'Alimentação', 'Item para casa', 'Desconhecido', 'Esporte', 'Educação', 
  'Etapa', 'Extra', 'Gasolina', 'Higiene', 'Investimento', 'Lazer', 
  'Mercado', 'Moradia', 'Outro', 'Refeição', 'Vestuário', 'Saúde', 
  'Trabalho', 'Veículo', 'Viagem'
];
const PAYMENT_METHODS = ['Pix / Dinheiro', 'Inter', 'Banrisul', 'Mercado Pago', 'Caixa Econômica'];

const FinancasApp: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('cn_financas');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  const [inName, setInName] = useState('');
  const [inAmount, setInAmount] = useState('');
  const [inCategory, setInCategory] = useState(ENTRADA_CATEGORIES[0]);
  const [inDate, setInDate] = useState('');

  const [outName, setOutName] = useState('');
  const [outAmount, setOutAmount] = useState('');
  const [outCategory, setOutCategory] = useState(SAIDA_CATEGORIES[0]);
  const [outDate, setOutDate] = useState('');
  const [outMethod, setOutMethod] = useState(PAYMENT_METHODS[0]);

  const [inPending, setInPending] = useState(false);
  const [outPending, setOutPending] = useState(false);

  const [inSort, setInSort] = useState<'date'|'value'|'category'>('date');
  const [outSort, setOutSort] = useState<'date'|'value'|'category'>('date');
  const [paymentSort, setPaymentSort] = useState<'value'|'type'>('value');
  const [categorySort, setCategorySort] = useState<'value'|'type'>('value');

  useEffect(() => {
    localStorage.setItem('cn_financas', JSON.stringify(transactions));
  }, [transactions]);

  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(currentMonthStr));
  }, [transactions, currentMonthStr]);

  const entradas = useMemo(() => {
    let sorted = [...monthTransactions.filter(t => t.type === 'entrada')];
    if (inSort === 'date') sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (inSort === 'value') sorted.sort((a, b) => b.amount - a.amount);
    if (inSort === 'category') sorted.sort((a, b) => a.category.localeCompare(b.category));
    return sorted;
  }, [monthTransactions, inSort]);

  const saidas = useMemo(() => {
    let sorted = [...monthTransactions.filter(t => t.type === 'saida')];
    if (outSort === 'date') sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (outSort === 'value') sorted.sort((a, b) => b.amount - a.amount);
    if (outSort === 'category') sorted.sort((a, b) => a.category.localeCompare(b.category));
    return sorted;
  }, [monthTransactions, outSort]);

  const totalEntradas = entradas.reduce((acc, t) => acc + t.amount, 0);
  const totalSaidas = saidas.reduce((acc, t) => acc + t.amount, 0);
  const saldo = totalEntradas - totalSaidas;

  const gastosPorCartao = useMemo(() => {
    const totals: Record<string, number> = {};
    monthTransactions.filter(t => t.type === 'saida').forEach(s => {
      const method = s.paymentMethod || 'Pix / Dinheiro';
      totals[method] = (totals[method] || 0) + s.amount;
    });
    return Object.entries(totals).sort((a, b) => paymentSort === 'value' ? b[1] - a[1] : a[0].localeCompare(b[0]));
  }, [monthTransactions, paymentSort]);

  const gastosPorCategoria = useMemo(() => {
    const totals: Record<string, number> = {};
    monthTransactions.filter(t => t.type === 'saida').forEach(s => {
      totals[s.category] = (totals[s.category] || 0) + s.amount;
    });
    return Object.entries(totals).sort((a, b) => categorySort === 'value' ? b[1] - a[1] : a[0].localeCompare(b[0]));
  }, [monthTransactions, categorySort]);

  const entradasPorCategoria = useMemo(() => {
    const totals: Record<string, number> = {};
    monthTransactions.filter(t => t.type === 'entrada').forEach(s => {
      totals[s.category] = (totals[s.category] || 0) + s.amount;
    });
    return Object.entries(totals).sort((a, b) => categorySort === 'value' ? b[1] - a[1] : a[0].localeCompare(b[0]));
  }, [monthTransactions, categorySort]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleAddEntrada = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inName || !inAmount) return;

    let finalDate = inDate;
    let dayOnly = false;
    if (!finalDate) {
      finalDate = new Date().toISOString().split('T')[0];
    } else if (finalDate.length <= 2) {
      dayOnly = true;
      const day = String(parseInt(finalDate)).padStart(2, '0');
      finalDate = `${currentMonthStr}-${day}`;
    }

    const t: Transaction = {
      id: crypto.randomUUID(),
      type: 'entrada',
      name: inName,
      amount: parseFloat(inAmount.replace(/\./g, '').replace(',', '.')),
      category: inCategory,
      date: finalDate,
      pending: inPending,
      dayOnly
    };

    setTransactions(prev => [...prev, t]);
    setInName('');
    setInAmount('');
    setInDate('');
    setInPending(false);
  };

  const handleAddSaida = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outName || !outAmount) return;

    let finalDate = outDate;
    let dayOnly = false;
    if (!finalDate) {
      finalDate = new Date().toISOString().split('T')[0];
    } else if (finalDate.length <= 2) {
      dayOnly = true;
      const day = String(parseInt(finalDate)).padStart(2, '0');
      finalDate = `${currentMonthStr}-${day}`;
    }

    const t: Transaction = {
      id: crypto.randomUUID(),
      type: 'saida',
      name: outName,
      amount: parseFloat(outAmount.replace(/\./g, '').replace(',', '.')),
      category: outCategory,
      date: finalDate,
      paymentMethod: outMethod,
      pending: outPending,
      dayOnly
    };

    setTransactions(prev => [...prev, t]);
    setOutName('');
    setOutAmount('');
    setOutDate('');
    setOutPending(false);
  };

  const togglePending = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, pending: !t.pending } : t));
  };

  const deleteTransaction = (id: string) => {
    if(confirm('Excluir este lançamento?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });

  return (
    <div className="flex h-screen bg-[#fdfdfc] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
      
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-white/50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all backdrop-blur-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 text-emerald-500 mb-8">
            <Wallet size={28} className="drop-shadow-sm" />
            <span className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white">Finanças</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Navegação</span>
            <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 mb-4">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-colors"><ChevronLeft size={16} /></button>
              <span className="font-bold uppercase tracking-wider text-xs text-center">{monthName.replace('. de ', '/')}</span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

        <div className="mt-auto p-6">
          <button onClick={() => window.location.hash = ''} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors font-bold text-sm uppercase tracking-wider">
            <LayoutTemplate size={18} /> Voltar ao Hub
          </button>
        </div>
      </aside>

      {/* Main Content - 3 Colunas flexíveis */}
      <main className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
        <div className="max-w-[1440px] mx-auto min-h-full grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
          
          {/* Coluna 1: Visão Geral */}
          <section className="flex flex-col gap-3 h-full min-h-0">
            
            {/* Saldo Cards */}
            <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-500/20 shrink-0">
              <p className="text-emerald-100 font-bold uppercase tracking-widest text-[10px] mb-0.5">Saldo do Mês</p>
              <h2 className="text-2xl font-black">{formatCurrency(saldo)}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-2 text-blue-500 mb-0.5">
                  <TrendingUp size={14} /><span className="text-[9px] font-bold uppercase tracking-wider">Entradas</span>
                </div>
                <p className="text-sm font-bold dark:text-white">{formatCurrency(totalEntradas)}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-2 text-rose-500 mb-0.5">
                  <TrendingDown size={14} /><span className="text-[9px] font-bold uppercase tracking-wider">Saídas</span>
                </div>
                <p className="text-sm font-bold dark:text-white">{formatCurrency(totalSaidas)}</p>
              </div>
            </div>

            {/* Faturas Cartões */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-100"><CreditCard size={14} className="text-zinc-400" /> Cartões</h3>
                <select value={paymentSort} onChange={e => setPaymentSort(e.target.value as any)} className="text-[9px] uppercase font-bold tracking-wider bg-transparent text-zinc-400 outline-none cursor-pointer">
                  <option value="value">Valor</option>
                  <option value="type">Tipo</option>
                </select>
              </div>
              <div className="flex-1 w-full min-h-0 relative">
                {gastosPorCartao.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-[10px] text-zinc-400">Nenhum gasto.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="2" dy="6" stdDeviation="4" floodOpacity="0.3" />
                        </filter>
                      </defs>
                      <Pie
                        data={gastosPorCartao.map(([name, value]) => ({ name, value }))}
                        cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value"
                        style={{ filter: 'url(#shadow3d)' }}
                      >
                        {gastosPorCartao.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                      <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top Categorias - Saídas */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-100"><PieChartIcon size={14} className="text-zinc-400" /> Saídas por Categoria</h3>
                <select value={categorySort} onChange={e => setCategorySort(e.target.value as any)} className="text-[9px] uppercase font-bold tracking-wider bg-transparent text-zinc-400 outline-none cursor-pointer">
                  <option value="value">Valor</option>
                  <option value="type">Tipo</option>
                </select>
              </div>
              <div className="flex-1 w-full min-h-0 relative">
                {gastosPorCategoria.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-[10px] text-zinc-400">Nenhum gasto.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="2" dy="6" stdDeviation="4" floodOpacity="0.3" />
                        </filter>
                      </defs>
                      <Pie
                        data={gastosPorCategoria.map(([name, value]) => ({ name, value }))}
                        cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value"
                        style={{ filter: 'url(#shadow3d)' }}
                      >
                        {gastosPorCategoria.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                      <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top Categorias - Entradas */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-100"><PieChartIcon size={14} className="text-zinc-400" /> Entradas por Categoria</h3>
                <select value={categorySort} onChange={e => setCategorySort(e.target.value as any)} className="text-[9px] uppercase font-bold tracking-wider bg-transparent text-zinc-400 outline-none cursor-pointer">
                  <option value="value">Valor</option>
                  <option value="type">Tipo</option>
                </select>
              </div>
              <div className="flex-1 w-full min-h-0 relative">
                {entradasPorCategoria.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-[10px] text-zinc-400">Nenhuma entrada.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="2" dy="6" stdDeviation="4" floodOpacity="0.3" />
                        </filter>
                      </defs>
                      <Pie
                        data={entradasPorCategoria.map(([name, value]) => ({ name, value }))}
                        cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value"
                        style={{ filter: 'url(#shadow3d)' }}
                      >
                        {entradasPorCategoria.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 6) % CHART_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                      <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </section>


          {/* Coluna 2: Entradas */}
          <section className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden xl:col-span-1">
            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black uppercase tracking-tight text-blue-600 dark:text-blue-400 flex items-center gap-2"><TrendingUp size={16} /> Entradas</h3>
                <select value={inSort} onChange={e => setInSort(e.target.value as any)} className="text-[9px] uppercase font-bold tracking-wider bg-transparent text-zinc-400 outline-none cursor-pointer">
                  <option value="date">Data</option>
                  <option value="value">Valor</option>
                  <option value="category">Categ</option>
                </select>
              </div>
              
              <form onSubmit={handleAddEntrada} className="space-y-2">
                <div className="flex gap-2">
                  <input type="text" placeholder="Data/Dia" value={inDate} onChange={e => setInDate(e.target.value)} className="w-1/3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:text-white" />
                  <input type="text" placeholder="Nome" value={inName} onChange={e => setInName(e.target.value)} className="w-2/3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:text-white" />
                </div>
                <div className="flex gap-2">
                  <select value={inCategory} onChange={e => setInCategory(e.target.value)} className="w-1/2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer dark:text-white">
                    {ENTRADA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" placeholder="R$" value={inAmount} onChange={e => setInAmount(e.target.value)} className="w-1/2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 font-bold dark:text-white" />
                </div>
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => setInPending(!inPending)} className={`w-1/3 border rounded-lg px-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${inPending ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' : 'bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                    {inPending ? 'Pendente' : 'Efetivado'}
                  </button>
                  <button disabled={!inName || !inAmount} type="submit" className="w-2/3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-1.5 font-bold text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50">Lançar Entrada</button>
                </div>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              <ul className="space-y-1.5">
                {entradas.map(t => (
                  <li key={t.id} className="group flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                        {t.dayOnly ? t.date.split('-')[2] : new Date(`${t.date}T12:00:00`).getDate()}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{t.name}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{t.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePending(t.id)} className={`p-1 rounded-lg transition-colors ${t.pending ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950 opacity-100' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 opacity-0 group-hover:opacity-100'}`} title={t.pending ? 'Pendente (Clique para Efetivar)' : 'Efetivado (Clique para Pendente)'}>
                        <TrendingUp size={14}/>
                      </button>
                      <span className={`font-bold text-xs ${t.pending ? 'text-amber-500' : 'text-blue-500'}`}>{formatCurrency(t.amount)}</span>
                      <button onClick={() => deleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 p-1"><Trash2 size={14}/></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>


          {/* Coluna 3: Saídas */}
          <section className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden xl:col-span-1">
            <div className="p-4 bg-rose-50/50 dark:bg-rose-900/10 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black uppercase tracking-tight text-rose-600 dark:text-rose-400 flex items-center gap-2"><TrendingDown size={16} /> Saídas</h3>
                <select value={outSort} onChange={e => setOutSort(e.target.value as any)} className="text-[9px] uppercase font-bold tracking-wider bg-transparent text-zinc-400 outline-none cursor-pointer">
                  <option value="date">Data</option>
                  <option value="value">Valor</option>
                  <option value="category">Categ</option>
                </select>
              </div>
              
              <form onSubmit={handleAddSaida} className="space-y-2">
                <div className="flex gap-2">
                  <input type="text" placeholder="Data/Dia" value={outDate} onChange={e => setOutDate(e.target.value)} className="w-1/3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 dark:text-white" />
                  <input type="text" placeholder="Nome" value={outName} onChange={e => setOutName(e.target.value)} className="w-2/3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 dark:text-white" />
                </div>
                <div className="flex gap-2">
                  <select value={outCategory} onChange={e => setOutCategory(e.target.value)} className="w-1/2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer dark:text-white">
                    {SAIDA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" placeholder="R$" value={outAmount} onChange={e => setOutAmount(e.target.value)} className="w-1/2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 font-bold dark:text-white" />
                </div>
                <select value={outMethod} onChange={e => setOutMethod(e.target.value)} className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer dark:text-white">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => setOutPending(!outPending)} className={`w-1/3 border rounded-lg px-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${outPending ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' : 'bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                    {outPending ? 'Pendente' : 'Efetivado'}
                  </button>
                  <button disabled={!outName || !outAmount} type="submit" className="w-2/3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg py-1.5 font-bold text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50">Lançar Saída</button>
                </div>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              <ul className="space-y-1.5">
                {saidas.map(t => (
                  <li key={t.id} className="group flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                        {t.dayOnly ? t.date.split('-')[2] : new Date(`${t.date}T12:00:00`).getDate()}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{t.name}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 flex gap-1.5">
                          <span>{t.category}</span>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span>{t.paymentMethod}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePending(t.id)} className={`p-1 rounded-lg transition-colors ${t.pending ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950 opacity-100' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 opacity-0 group-hover:opacity-100'}`} title={t.pending ? 'Pendente (Clique para Efetivar)' : 'Efetivado (Clique para Pendente)'}>
                        <TrendingDown size={14}/>
                      </button>
                      <span className={`font-bold text-xs ${t.pending ? 'text-amber-500' : 'text-rose-500'}`}>{formatCurrency(t.amount)}</span>
                      <button onClick={() => deleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 p-1"><Trash2 size={14}/></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default FinancasApp;
