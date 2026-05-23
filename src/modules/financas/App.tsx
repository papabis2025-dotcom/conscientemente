import React, { useState, useEffect, useMemo } from 'react';
import { LayoutTemplate, Wallet, TrendingUp, TrendingDown, CreditCard, ChevronLeft, ChevronRight, Trash2, Calendar, PieChart as PieChartIcon, Edit3 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { financasApi } from './api';

const CHART_COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

// Custom label with leader lines for pie chart slices
const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, value, percent }: any, formatCurrencyFn: (v: number) => string) => {
  if (percent < 0.04) return null; // Skip tiny slices
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const mx = cx + (outerRadius + 18) * cos;
  const my = cy + (outerRadius + 18) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 14;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';
  const shortName = name.length > 14 ? name.slice(0, 13) + '…' : name;
  return (
    <g>
      <line x1={mx} y1={my} x2={ex} y2={ey} stroke="#a1a1aa" strokeWidth={1} />
      <circle cx={ex} cy={ey} r={2} fill="#a1a1aa" />
      <text x={ex + (cos >= 0 ? 4 : -4)} y={ey - 4} textAnchor={textAnchor} fill="currentColor" fontSize={9} fontWeight={700} className="fill-zinc-700 dark:fill-zinc-300">
        {shortName}
      </text>
      <text x={ex + (cos >= 0 ? 4 : -4)} y={ey + 7} textAnchor={textAnchor} fill="currentColor" fontSize={9} fontWeight={600} className="fill-zinc-500 dark:fill-zinc-400">
        {formatCurrencyFn(value)}
      </text>
    </g>
  );
};

export type TransactionType = 'entrada' | 'saida';

export interface Transaction {
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

import AjustesFinancas from './AjustesFinancas';
import ResumoAnual from './ResumoAnual';

export interface FinCategoria {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_ENTRADA_CATEGORIES: FinCategoria[] = ['Trabalho', 'Outros', 'Investimentos', 'Extra', 'Cashback', 'Reserva', 'Residual'].map((c, i) => ({ id: `in_${i}`, name: c, color: CHART_COLORS[i % CHART_COLORS.length] }));
const DEFAULT_SAIDA_CATEGORIES: FinCategoria[] = [
  'Alimentação', 'Item para casa', 'Desconhecido', 'Esporte', 'Educação', 
  'Etapa', 'Extra', 'Gasolina', 'Higiene', 'Investimento', 'Lazer', 
  'Mercado', 'Moradia', 'Outro', 'Refeição', 'Vestuário', 'Saúde', 
  'Trabalho', 'Veículo', 'Viagem'
].map((c, i) => ({ id: `out_${i}`, name: c, color: CHART_COLORS[(i + 3) % CHART_COLORS.length] }));
const DEFAULT_PAYMENT_METHODS: FinCategoria[] = ['Pix / Dinheiro', 'Inter', 'Banrisul', 'Mercado Pago', 'Caixa Econômica'].map((c, i) => ({ id: `pay_${i}`, name: c, color: CHART_COLORS[i % CHART_COLORS.length] }));

const FinancasApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'anual' | 'ajustes'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('isSidebarCollapsed_financas') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isSidebarCollapsed_financas', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const [inCategories, setInCategories] = useState<FinCategoria[]>(DEFAULT_ENTRADA_CATEGORIES);
  const [outCategories, setOutCategories] = useState<FinCategoria[]>(DEFAULT_SAIDA_CATEGORIES);
  const [paymentMethods, setPaymentMethods] = useState<FinCategoria[]>(DEFAULT_PAYMENT_METHODS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const trans = await financasApi.listTransactions();
        setTransactions(trans);
        
        const config = await financasApi.loadConfig();
        if (config) {
          if (config.fin_in_categories) setInCategories(config.fin_in_categories as any);
          if (config.fin_out_categories) setOutCategories(config.fin_out_categories as any);
          if (config.fin_payment_methods) setPaymentMethods(config.fin_payment_methods as any);
        }
      } catch (err) {
        console.error('Failed to load finance data:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      financasApi.saveConfig({ fin_in_categories: inCategories }).catch(err => console.error('Error saving in categories:', err));
    }
  }, [inCategories, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      financasApi.saveConfig({ fin_out_categories: outCategories }).catch(err => console.error('Error saving out categories:', err));
    }
  }, [outCategories, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      financasApi.saveConfig({ fin_payment_methods: paymentMethods }).catch(err => console.error('Error saving payment methods:', err));
    }
  }, [paymentMethods, isLoaded]);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  const [txType, setTxType] = useState<TransactionType>('saida');
  const [txName, setTxName] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txDate, setTxDate] = useState('');
  const [txMethod, setTxMethod] = useState('');
  const [txPending, setTxPending] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'cartoes' | 'saidas' | 'entradas'>('cartoes');

  useEffect(() => {
    const targetType = sessionStorage.getItem('openAddFinancasType');
    if (targetType === 'entrada' || targetType === 'saida') {
      sessionStorage.removeItem('openAddFinancasType');
      setTxType(targetType as TransactionType);
      setActiveTab('dashboard');
      setTimeout(() => {
        const inputEl = document.querySelector('input[placeholder="Ex: Supermercado"]');
        if (inputEl) {
          (inputEl as HTMLInputElement).focus();
        }
      }, 100);
    }
  }, []);

  // Atualizar seleções caso a categoria ativa seja apagada ou mude o tipo
  useEffect(() => {
    if (txType === 'entrada') {
      if (inCategories.length > 0 && (!txCategory || !inCategories.find(c => c.name === txCategory))) {
        setTxCategory(inCategories[0].name);
      }
    } else {
      if (outCategories.length > 0 && (!txCategory || !outCategories.find(c => c.name === txCategory))) {
        setTxCategory(outCategories[0].name);
      }
      if (paymentMethods.length > 0 && (!txMethod || !paymentMethods.find(m => m.name === txMethod))) {
        setTxMethod(paymentMethods[0].name);
      }
    }
  }, [txType, inCategories, outCategories, paymentMethods]);

  const [inSort, setInSort] = useState<'date'|'value'|'category'>('date');
  const [outSort, setOutSort] = useState<'date'|'value'|'category'>('date');
  const [paymentSort, setPaymentSort] = useState<'value'|'type'>('value');
  const [categorySort, setCategorySort] = useState<'value'|'type'>('value');

  // localStorage triggers removed

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

  const startEditTransaction = (t: Transaction) => {
    setEditingTxId(t.id);
    setTxType(t.type);
    setTxName(t.name);
    // Format amount cleanly for editing text box (e.g. 1500,50 or 1500.5 -> 1500,50)
    setTxAmount(t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setTxCategory(t.category);
    if (t.dayOnly) {
      setTxDate(t.date.split('-')[2]);
    } else {
      setTxDate(t.date);
    }
    setTxPending(t.pending || false);
    setTxMethod(t.paymentMethod || '');

    // Focus input
    setTimeout(() => {
      const inputEl = document.querySelector('input[placeholder="Ex: Supermercado"]');
      if (inputEl) {
        (inputEl as HTMLInputElement).focus();
      }
    }, 50);
  };

  const cancelEdit = () => {
    setEditingTxId(null);
    setTxName('');
    setTxAmount('');
    setTxDate('');
    setTxPending(false);
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txName || !txAmount) return;

    let finalDate = txDate;
    let dayOnly = false;
    if (!finalDate) {
      finalDate = new Date().toISOString().split('T')[0];
    } else if (finalDate.length <= 2) {
      dayOnly = true;
      const day = String(parseInt(finalDate)).padStart(2, '0');
      finalDate = `${currentMonthStr}-${day}`;
    }

    const amountNum = parseFloat(txAmount.replace(/\./g, '').replace(',', '.'));

    if (editingTxId) {
      const updatedTx: Transaction = {
        id: editingTxId,
        type: txType,
        name: txName,
        amount: amountNum,
        category: txCategory,
        date: finalDate,
        pending: txPending,
        dayOnly,
        ...(txType === 'saida' ? { paymentMethod: txMethod } : {})
      };

      financasApi.updateTransaction(editingTxId, updatedTx).catch(err => console.error('Error updating transaction:', err));
      setTransactions(prev => prev.map(t => t.id === editingTxId ? updatedTx : t));
      setEditingTxId(null);
      setTxName('');
      setTxAmount('');
      setTxDate('');
      setTxPending(false);
    } else {
      const t: Transaction = {
        id: crypto.randomUUID(),
        type: txType,
        name: txName,
        amount: amountNum,
        category: txCategory,
        date: finalDate,
        pending: txPending,
        dayOnly,
        ...(txType === 'saida' ? { paymentMethod: txMethod } : {})
      };

      financasApi.createTransaction(t).catch(err => console.error('Error creating transaction:', err));
      setTransactions(prev => [...prev, t]);
      setTxName('');
      setTxAmount('');
      setTxDate('');
      setTxPending(false);
    }
  };

  const togglePending = (id: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        const newPending = !t.pending;
        financasApi.updateTransaction(id, { pending: newPending }).catch(err => console.error('Error updating transaction:', err));
        return { ...t, pending: newPending };
      }
      return t;
    }));
  };

  const deleteTransaction = (id: string) => {
    if(confirm('Excluir este lançamento?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      financasApi.deleteTransaction(id).catch(err => console.error('Error deleting transaction:', err));
    }
  };

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });

  return (
    <div className="flex h-screen bg-transparent text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
      
      {/* Sidebar Lateral */}
      <aside className={`relative ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white/50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 backdrop-blur-xl`}>
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-100 shadow-sm z-50 hover:scale-110 transition-transform"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`flex-1 flex flex-col min-h-0 ${isSidebarCollapsed ? 'p-3' : 'p-5'}`}>
          <div className={`flex items-center gap-3 text-emerald-500 mb-8 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <Wallet size={28} className="drop-shadow-sm shrink-0" />
            {!isSidebarCollapsed && (
              <span className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white animate-in fade-in slide-in-from-left-4 duration-300">
                Finanças
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {!isSidebarCollapsed && <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Navegação</span>}
            <div className="flex flex-col gap-1 mb-4">
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`rounded-xl flex items-center transition-all text-xs font-bold uppercase tracking-wider ${isSidebarCollapsed ? 'justify-center p-3' : 'p-3 gap-3'} ${activeTab === 'dashboard' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-zinc-500 hover:bg-white dark:hover:bg-zinc-800'}`}
                title={isSidebarCollapsed ? 'Dashboard' : ''}
              >
                <TrendingUp size={16} className="shrink-0" />
                {!isSidebarCollapsed && <span>Dashboard</span>}
              </button>
              <button 
                onClick={() => setActiveTab('anual')} 
                className={`rounded-xl flex items-center transition-all text-xs font-bold uppercase tracking-wider ${isSidebarCollapsed ? 'justify-center p-3' : 'p-3 gap-3'} ${activeTab === 'anual' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-zinc-500 hover:bg-white dark:hover:bg-zinc-800'}`}
                title={isSidebarCollapsed ? 'Resumo Anual' : ''}
              >
                <Calendar size={16} className="shrink-0" />
                {!isSidebarCollapsed && <span>Resumo Anual</span>}
              </button>
              <button 
                onClick={() => setActiveTab('ajustes')} 
                className={`rounded-xl flex items-center transition-all text-xs font-bold uppercase tracking-wider ${isSidebarCollapsed ? 'justify-center p-3' : 'p-3 gap-3'} ${activeTab === 'ajustes' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-zinc-500 hover:bg-white dark:hover:bg-zinc-800'}`}
                title={isSidebarCollapsed ? 'Ajustes' : ''}
              >
                <Wallet size={16} className="shrink-0" />
                {!isSidebarCollapsed && <span>Ajustes</span>}
              </button>
            </div>
            
            <div className="flex flex-col gap-2 mt-4">
              {!isSidebarCollapsed && <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Calendário</span>}
              <div className={`flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 ${isSidebarCollapsed ? 'flex-col gap-1' : ''}`}>
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-colors"><ChevronLeft size={14} /></button>
                <span className={`font-bold uppercase tracking-wider text-center ${isSidebarCollapsed ? 'text-[9px] leading-tight my-0.5' : 'text-xs'}`}>
                  {isSidebarCollapsed ? currentDate.toLocaleString('pt-BR', { month: 'narrow' }) : monthName.replace('. de ', '/')}
                </span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-colors"><ChevronRight size={14} /></button>
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-auto ${isSidebarCollapsed ? 'p-3' : 'p-5'}`}>
          <button 
            onClick={() => window.location.hash = ''} 
            className={`w-full flex items-center justify-center ${isSidebarCollapsed ? 'p-3' : 'gap-2 py-3 px-4'} bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors font-bold text-sm uppercase tracking-wider`}
            title="Voltar ao Hub"
          >
            <LayoutTemplate size={18} className="shrink-0" />
            {!isSidebarCollapsed && <span>Voltar ao Hub</span>}
          </button>
        </div>
      </aside>

      {/* Main Content - 3 Colunas flexíveis */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col bg-zinc-50 dark:bg-[#0c0c0e]">
        {activeTab === 'ajustes' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AjustesFinancas 
              inCategories={inCategories} setInCategories={setInCategories}
              outCategories={outCategories} setOutCategories={setOutCategories}
              paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods}
            />
          </div>
        ) : activeTab === 'anual' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ResumoAnual 
              transactions={transactions}
              inCategories={inCategories}
              outCategories={outCategories}
              paymentMethods={paymentMethods}
            />
          </div>
        ) : (
          <div className="max-w-[1440px] mx-auto w-full h-full grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 overflow-hidden">
          
          {/* Coluna 1: Visão Geral */}
          <section className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto custom-scrollbar pr-1">
            
            {/* Saldo Cards */}
            <div className={`p-4 rounded-2xl shadow-lg shrink-0 transition-colors ${saldo < 0 ? 'bg-red-500 shadow-red-500/25 text-white' : 'bg-emerald-500 shadow-emerald-500/25 text-white'}`}>
              <p className="opacity-90 font-bold uppercase tracking-widest text-[9px] mb-0.5">Saldo do Mês</p>
              <h2 className="text-2xl font-black">{formatCurrency(saldo)}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="bg-white dark:bg-[#121214] p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-2 text-blue-500 mb-0.5">
                  <TrendingUp size={14} /><span className="text-[9px] font-bold uppercase tracking-wider">Entradas</span>
                </div>
                <p className="text-sm font-bold dark:text-white">{formatCurrency(totalEntradas)}</p>
              </div>
              <div className="bg-white dark:bg-[#121214] p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-2 text-rose-500 mb-0.5">
                  <TrendingDown size={14} /><span className="text-[9px] font-bold uppercase tracking-wider">Saídas</span>
                </div>
                <p className="text-sm font-bold dark:text-white">{formatCurrency(totalSaidas)}</p>
              </div>
            </div>

            {/* Caixa Única de Transação */}
            <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  {editingTxId ? 'Editar Transação' : 'Nova Transação'}
                </h3>
                
                {/* Selector de tipo de transação (Entrada/Saída) */}
                <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
                  <button 
                    type="button"
                    onClick={() => setTxType('saida')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors ${txType === 'saida' ? 'bg-rose-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    <TrendingDown size={10} /> Saída
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTxType('entrada')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors ${txType === 'entrada' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    <TrendingUp size={10} /> Entrada
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-2.5">
                <div className="flex gap-2">
                  <div className="w-1/3 flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Dia ou Data</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 19" 
                      value={txDate} 
                      onChange={e => setTxDate(e.target.value)} 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 dark:text-white font-semibold" 
                    />
                  </div>
                  <div className="w-2/3 flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Nome / Descrição</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Supermercado" 
                      value={txName} 
                      onChange={e => setTxName(e.target.value)} 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 dark:text-white font-semibold" 
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="w-1/2 flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Categoria</label>
                    <select 
                      value={txCategory} 
                      onChange={e => setTxCategory(e.target.value)} 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer dark:text-white font-semibold"
                    >
                      {txType === 'entrada' 
                        ? inCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                        : outCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                      }
                    </select>
                  </div>
                  <div className="w-1/2 flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Valor (R$)</label>
                    <input 
                      type="text" 
                      placeholder="0,00" 
                      value={txAmount} 
                      onChange={e => setTxAmount(e.target.value)} 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 font-bold dark:text-white" 
                    />
                  </div>
                </div>

                {txType === 'saida' && (
                  <div className="flex flex-col gap-1 animate-in slide-in-from-top-1 duration-150">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Forma de Pagamento</label>
                    <select 
                      value={txMethod} 
                      onChange={e => setTxMethod(e.target.value)} 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer dark:text-white font-semibold"
                    >
                      {paymentMethods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="flex gap-2 items-center pt-2.5 border-t border-zinc-100 dark:border-zinc-800/50">
                  <button 
                    type="button" 
                    onClick={() => setTxPending(!txPending)} 
                    className={`flex-1 border rounded-lg py-2 text-[9px] font-black uppercase tracking-wider transition-colors ${txPending ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : 'bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/55'}`}
                  >
                    {txPending ? 'Pendente' : 'Efetivado'}
                  </button>
                  <button 
                    disabled={!txName || !txAmount} 
                    type="submit" 
                    className={`flex-[2] text-white rounded-lg py-2 font-black text-[9px] uppercase tracking-wider transition-colors disabled:opacity-50 ${txType === 'saida' ? 'bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/10' : 'bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-500/10'}`}
                  >
                    {editingTxId ? 'Salvar' : `Lançar ${txType === 'saida' ? 'Saída' : 'Entrada'}`}
                  </button>
                </div>
                {editingTxId && (
                  <button 
                    type="button" 
                    onClick={cancelEdit} 
                    className="w-full mt-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-2 text-[9px] font-black uppercase tracking-wider transition-colors border border-zinc-200 dark:border-zinc-700/50"
                  >
                    Cancelar Edição
                  </button>
                )}
              </form>
            </div>

            {/* Gráficos */}
            <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col h-[420px]">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-100">
                  <PieChartIcon size={14} className="text-zinc-400" /> Gráficos
                </h3>
                <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
                  <button 
                    onClick={() => setActiveChartTab('cartoes')}
                    className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors ${activeChartTab === 'cartoes' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    Cartões
                  </button>
                  <button 
                    onClick={() => setActiveChartTab('saidas')}
                    className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors ${activeChartTab === 'saidas' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    Saídas
                  </button>
                  <button 
                    onClick={() => setActiveChartTab('entradas')}
                    className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors ${activeChartTab === 'entradas' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    Entradas
                  </button>
                </div>
              </div>
              
              <div className="flex-1 w-full min-h-0 relative overflow-y-auto custom-scrollbar pr-1">
                {activeChartTab === 'cartoes' && (
                  gastosPorCartao.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Nenhum gasto registrado</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 py-2">
                      {(() => {
                        const total = gastosPorCartao.reduce((sum, [_, val]) => sum + val, 0) || 1;
                        return gastosPorCartao.map(([name, val], index) => {
                          const color = paymentMethods.find(c => c.name === name)?.color || CHART_COLORS[index % CHART_COLORS.length];
                          const percentage = (val / total) * 100;
                          return (
                            <div key={name} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                                  <span className="truncate max-w-[120px]">{name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-[10px]">{formatCurrency(val)}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 min-w-[36px] text-center font-bold">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-zinc-100 dark:bg-zinc-800/60 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${percentage}%`, backgroundColor: color }}
                                ></div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )
                )}

                {activeChartTab === 'saidas' && (
                  gastosPorCategoria.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Nenhum gasto registrado</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 py-2">
                      {(() => {
                        const total = gastosPorCategoria.reduce((sum, [_, val]) => sum + val, 0) || 1;
                        return gastosPorCategoria.map(([name, val], index) => {
                          const color = outCategories.find(c => c.name === name)?.color || CHART_COLORS[(index + 3) % CHART_COLORS.length];
                          const percentage = (val / total) * 100;
                          return (
                            <div key={name} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                                  <span className="truncate max-w-[120px]">{name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-[10px]">{formatCurrency(val)}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 min-w-[36px] text-center font-bold">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-zinc-100 dark:bg-zinc-800/60 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${percentage}%`, backgroundColor: color }}
                                ></div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )
                )}

                {activeChartTab === 'entradas' && (
                  entradasPorCategoria.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Nenhuma entrada registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 py-2">
                      {(() => {
                        const total = entradasPorCategoria.reduce((sum, [_, val]) => sum + val, 0) || 1;
                        return entradasPorCategoria.map(([name, val], index) => {
                          const color = inCategories.find(c => c.name === name)?.color || CHART_COLORS[(index + 6) % CHART_COLORS.length];
                          const percentage = (val / total) * 100;
                          return (
                            <div key={name} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                                  <span className="truncate max-w-[120px]">{name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-[10px]">{formatCurrency(val)}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 min-w-[36px] text-center font-bold">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-zinc-100 dark:bg-zinc-800/60 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${percentage}%`, backgroundColor: color }}
                                ></div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )
                )}
              </div>
            </div>

          </section>

          {/* Coluna 2: Entradas */}
          <section className="flex flex-col h-full bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm overflow-hidden xl:col-span-1">
            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-tight text-blue-600 dark:text-blue-400 flex items-center gap-2"><TrendingUp size={16} /> Entradas</h3>
                <select value={inSort} onChange={e => setInSort(e.target.value as any)} className="text-[9px] uppercase font-bold tracking-wider bg-transparent text-zinc-400 outline-none cursor-pointer">
                  <option value="date">Data</option>
                  <option value="value">Valor</option>
                  <option value="category">Categ</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {entradas.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center py-20 text-zinc-400 text-xs font-semibold">
                  Nenhuma entrada este mês.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {entradas.map(t => (
                    <li key={t.id} className="group flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/55 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
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
                        <button onClick={() => startEditTransaction(t)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-blue-500 p-1" title="Editar"><Edit3 size={14}/></button>
                        <button onClick={() => deleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 p-1" title="Excluir"><Trash2 size={14}/></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Coluna 3: Saídas */}
          <section className="flex flex-col h-full bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm overflow-hidden xl:col-span-1">
            <div className="p-4 bg-rose-50/50 dark:bg-rose-900/10 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-tight text-rose-600 dark:text-rose-400 flex items-center gap-2"><TrendingDown size={16} /> Saídas</h3>
                <select value={outSort} onChange={e => setOutSort(e.target.value as any)} className="text-[9px] uppercase font-bold tracking-wider bg-transparent text-zinc-400 outline-none cursor-pointer">
                  <option value="date">Data</option>
                  <option value="value">Valor</option>
                  <option value="category">Categ</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {saidas.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center py-20 text-zinc-400 text-xs font-semibold">
                  Nenhuma saída este mês.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {saidas.map(t => (
                    <li key={t.id} className="group flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/55 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
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
                        <button onClick={() => startEditTransaction(t)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-blue-500 p-1" title="Editar"><Edit3 size={14}/></button>
                        <button onClick={() => deleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 p-1" title="Excluir"><Trash2 size={14}/></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          </div>
        )}
      </main>
    </div>
  );
};

export default FinancasApp;
