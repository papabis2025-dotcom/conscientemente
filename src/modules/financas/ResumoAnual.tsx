import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, CreditCard, DollarSign, PiggyBank, 
  ArrowUpRight, ArrowDownRight, Calendar, Percent, Tag, ShieldCheck, HelpCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { Transaction, FinCategoria } from './App';

interface ResumoAnualProps {
  transactions: Transaction[];
  inCategories: FinCategoria[];
  outCategories: FinCategoria[];
  paymentMethods: FinCategoria[];
}

const CHART_COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

const ResumoAnual: React.FC<ResumoAnualProps> = ({ 
  transactions, 
  inCategories, 
  outCategories, 
  paymentMethods 
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [includePending, setIncludePending] = useState<boolean>(true);
  const [categoryTypeTab, setCategoryTypeTab] = useState<'saidas' | 'entradas'>('saidas');

  // Formatar valores para Moeda Brasileira
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Identificar todos os anos que possuem lançamentos
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    transactions.forEach(t => {
      if (t.date) {
        // Formato esperado: YYYY-MM-DD
        const year = parseInt(t.date.split('-')[0]);
        if (!isNaN(year)) years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Transações do ano selecionado e filtros de pendência
  const yearTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const year = parseInt(t.date.split('-')[0]);
      const matchesYear = year === selectedYear;
      const matchesPending = includePending ? true : !t.pending;
      return matchesYear && matchesPending;
    });
  }, [transactions, selectedYear, includePending]);

  // Valores totais do ano
  const annualIncomes = useMemo(() => yearTransactions.filter(t => t.type === 'entrada'), [yearTransactions]);
  const annualExpenses = useMemo(() => yearTransactions.filter(t => t.type === 'saida'), [yearTransactions]);

  const totalIncomes = useMemo(() => annualIncomes.reduce((sum, t) => sum + t.amount, 0), [annualIncomes]);
  const totalExpenses = useMemo(() => annualExpenses.reduce((sum, t) => sum + t.amount, 0), [annualExpenses]);
  const balance = totalIncomes - totalExpenses;
  
  // Taxa de Poupança / Reserva (%)
  const savingsRate = totalIncomes > 0 ? (balance / totalIncomes) * 100 : 0;

  // Evolução Mensal (Janeiro a Dezembro)
  const monthlyEvolutionData = useMemo(() => {
    const months = [
      { name: 'Jan', key: '01' },
      { name: 'Fev', key: '02' },
      { name: 'Mar', key: '03' },
      { name: 'Abr', key: '04' },
      { name: 'Mai', key: '05' },
      { name: 'Jun', key: '06' },
      { name: 'Jul', key: '07' },
      { name: 'Ago', key: '08' },
      { name: 'Set', key: '09' },
      { name: 'Out', key: '10' },
      { name: 'Nov', key: '11' },
      { name: 'Dez', key: '12' }
    ];

    return months.map(m => {
      const monthTrans = yearTransactions.filter(t => t.date && t.date.split('-')[1] === m.key);
      const inc = monthTrans.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
      const exp = monthTrans.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
      return {
        name: m.name,
        Entradas: inc,
        Saídas: exp,
        Saldo: inc - exp
      };
    });
  }, [yearTransactions]);

  // Consolidado de Saídas por Categoria
  const expensesByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    annualExpenses.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + t.amount;
    });
    return Object.entries(counts)
      .map(([name, amount]) => {
        const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
        const catColor = outCategories.find(c => c.name === name)?.color || CHART_COLORS[0];
        return { name, amount, percentage, color: catColor };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [annualExpenses, outCategories, totalExpenses]);

  // Consolidado de Entradas por Categoria
  const incomesByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    annualIncomes.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + t.amount;
    });
    return Object.entries(counts)
      .map(([name, amount]) => {
        const percentage = totalIncomes > 0 ? (amount / totalIncomes) * 100 : 0;
        const catColor = inCategories.find(c => c.name === name)?.color || CHART_COLORS[2];
        return { name, amount, percentage, color: catColor };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [annualIncomes, inCategories, totalIncomes]);

  // Consolidado de Gastos por Meios de Pagamento
  const expensesByPayment = useMemo(() => {
    const counts: Record<string, number> = {};
    annualExpenses.forEach(t => {
      const method = t.paymentMethod || 'Pix / Dinheiro';
      counts[method] = (counts[method] || 0) + t.amount;
    });
    return Object.entries(counts)
      .map(([name, amount]) => {
        const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
        const methodColor = paymentMethods.find(m => m.name === name)?.color || CHART_COLORS[3];
        return { name, amount, percentage, color: methodColor };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [annualExpenses, paymentMethods, totalExpenses]);

  // Top 5 Maiores Lançamentos de Saída no Ano
  const topExpenses = useMemo(() => {
    return [...annualExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [annualExpenses]);

  return (
    <div className="max-w-[1440px] mx-auto w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Header com Filtros */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm shrink-0">
        <div className="shrink-0" />

        <div className="flex flex-wrap items-center gap-4">
          {/* Seletor de Anos */}
          <div className="flex bg-zinc-100 dark:bg-zinc-900/60 rounded-xl p-1 border border-zinc-200/20 dark:border-zinc-800">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  selectedYear === year 
                    ? 'bg-zinc-900 dark:bg-zinc-800 text-white shadow-md' 
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Toggle Pendentes */}
          <button
            onClick={() => setIncludePending(!includePending)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
              includePending
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                : 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/55'
            }`}
          >
            <ShieldCheck size={14} />
            {includePending ? 'Com Pendentes' : 'Apenas Efetivados'}
          </button>
        </div>
      </header>

      {/* Cards de Métricas Anuais */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Anual */}
        <div className="bg-white dark:bg-[#121214] p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Receita Anual</span>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white">{formatCurrency(totalIncomes)}</h3>
            <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5 mt-0.5">
              <ArrowUpRight size={10} /> Média mensal: {formatCurrency(totalIncomes / 12)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Despesa Anual */}
        <div className="bg-white dark:bg-[#121214] p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Despesa Anual</span>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white">{formatCurrency(totalExpenses)}</h3>
            <span className="text-[9px] font-bold text-rose-500 flex items-center gap-0.5 mt-0.5">
              <ArrowDownRight size={10} /> Média mensal: {formatCurrency(totalExpenses / 12)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <TrendingDown size={22} />
          </div>
        </div>

        {/* Saldo Anual */}
        <div className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between transition-colors ${
          balance >= 0 
            ? 'bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/5 dark:border-emerald-500/20' 
            : 'bg-rose-500/5 border-rose-500/20 dark:bg-rose-500/5 dark:border-rose-500/20'
        }`}>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Saldo Líquido</span>
            <h3 className={`text-xl font-black ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(balance)}
            </h3>
            <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 mt-0.5 ${
              balance >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {balance >= 0 ? 'Superávit Anual' : 'Déficit Anual'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            balance >= 0 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            <DollarSign size={22} />
          </div>
        </div>

        {/* Taxa de Poupança */}
        <div className="bg-white dark:bg-[#121214] p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Taxa de Poupança</span>
            <h3 className={`text-xl font-black ${savingsRate >= 0 ? 'text-zinc-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              {savingsRate.toFixed(1)}%
            </h3>
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5 mt-0.5">
              Relação saldo / receita bruta
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <PiggyBank size={22} />
          </div>
        </div>
      </section>

      {/* Gráfico de Evolução Mensal */}
      <section className="bg-white dark:bg-[#121214] p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-200">Evolução Mensal do Fluxo</h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Comparativo mensal de Entradas e Saídas</p>
          </div>
          <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5 text-blue-500">
              <span className="w-3 h-3 rounded-full bg-blue-500 block"></span> Entradas
            </div>
            <div className="flex items-center gap-1.5 text-rose-500">
              <span className="w-3 h-3 rounded-full bg-rose-500 block"></span> Saídas
            </div>
          </div>
        </div>
        
        <div className="h-[320px] w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyEvolutionData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-zinc-800/60" />
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  backgroundColor: '#18181b', 
                  color: '#fff',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)', 
                  fontSize: '11px', 
                  fontWeight: 'bold' 
                }} 
              />
              <Bar dataKey="Entradas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Saídas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Grid de Detalhamento: Categorias vs Meios de Pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Detalhamento por Categoria (Ocupa 2 Colunas) */}
        <section className="lg:col-span-2 bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-200">Valores Consolidados por Categoria</h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Distribuição percentual e média mensal das categorias</p>
            </div>
            
            {/* Tabs para Categoria (Saídas / Entradas) */}
            <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5 border border-zinc-200/40 dark:border-zinc-800/60 self-start sm:self-auto">
              <button 
                onClick={() => setCategoryTypeTab('saidas')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-colors ${
                  categoryTypeTab === 'saidas' 
                    ? 'bg-rose-500 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                Saídas
              </button>
              <button 
                onClick={() => setCategoryTypeTab('entradas')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-colors ${
                  categoryTypeTab === 'entradas' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                Entradas
              </button>
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto max-h-[460px] custom-scrollbar">
            {categoryTypeTab === 'saidas' ? (
              expensesByCategory.length === 0 ? (
                <div className="text-center py-20 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                  Nenhuma despesa registrada para o ano de {selectedYear}.
                </div>
              ) : (
                <div className="space-y-4">
                  {expensesByCategory.map(cat => (
                    <div key={cat.name} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                          <span>{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Média: {formatCurrency(cat.amount / 12)}/mês</span>
                          <span className="font-extrabold">{formatCurrency(cat.amount)}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 min-w-10 text-center font-bold">
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800/60 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              incomesByCategory.length === 0 ? (
                <div className="text-center py-20 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                  Nenhuma receita registrada para o ano de {selectedYear}.
                </div>
              ) : (
                <div className="space-y-4">
                  {incomesByCategory.map(cat => (
                    <div key={cat.name} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                          <span>{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Média: {formatCurrency(cat.amount / 12)}/mês</span>
                          <span className="font-extrabold">{formatCurrency(cat.amount)}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 min-w-10 text-center font-bold">
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800/60 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </section>

        {/* Consolidação por Meios de Pagamento */}
        <section className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
            <h3 className="text-sm font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <CreditCard size={16} className="text-zinc-400" />
              Meios de Pagamento
            </h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Gastos consolidados por canal de pagamento</p>
          </div>

          <div className="p-6 flex-1 overflow-y-auto max-h-[460px] custom-scrollbar">
            {expensesByPayment.length === 0 ? (
              <div className="text-center py-20 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                Nenhum gasto registrado para o ano de {selectedYear}.
              </div>
            ) : (
              <div className="space-y-4">
                {expensesByPayment.map(item => (
                  <div key={item.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="font-extrabold">{formatCurrency(item.amount)}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-black">
                          {item.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800/60 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ResumoAnual;
