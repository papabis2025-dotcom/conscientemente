import React, { useState } from 'react';
import { Transaction, FinCategoria } from './api';
import { Calendar, Receipt, FileText, CheckCircle, Clock, Trash2, Plus, Info } from 'lucide-react';
import { financasApi } from './api';

interface ImpostoRendaProps {
  transactions: Transaction[];
  onUpdateTransactions: (transactions: Transaction[]) => void;
  outCategories: FinCategoria[];
  paymentMethods: FinCategoria[];
}

export const ImpostoRenda: React.FC<ImpostoRendaProps> = ({ 
  transactions, 
  onUpdateTransactions, 
  outCategories, 
  paymentMethods 
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(outCategories[0]?.name || 'Saúde');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]?.name || 'Pix / Dinheiro');
  const [pending, setPending] = useState(false);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
  };

  // Filter IR transactions: category === 'Imposto de Renda' OR name starts with [IR]
  const irTransactions = transactions.filter(t => 
    t.type === 'saida' && (t.category === 'Imposto de Renda' || t.name.startsWith('[IR]'))
  );

  // Sort by date descending
  const sortedTransactions = [...irTransactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Group transactions by year
  const transactionsByYear = sortedTransactions.reduce((acc: Record<string, Transaction[]>, t) => {
    const year = t.date ? t.date.split('-')[0] : new Date().getFullYear().toString();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(t);
    return acc;
  }, {});

  // Sort years descending
  const sortedYears = Object.keys(transactionsByYear).sort((a, b) => parseInt(b) - parseInt(a));

  const totalDeductions = irTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalPaid = irTransactions.filter(t => !t.pending).reduce((acc, t) => acc + t.amount, 0);
  const totalPending = irTransactions.filter(t => t.pending).reduce((acc, t) => acc + t.amount, 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount.trim()) return;

    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) return;

    // Prefix name with [IR] to tag it as income-tax deductible
    const finalName = name.startsWith('[IR]') ? name : `[IR] ${name}`;

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      type: 'saida',
      name: finalName,
      amount: amountNum,
      category,
      date,
      pending,
      paymentMethod
    };

    try {
      await financasApi.createTransaction(newTx);
      onUpdateTransactions([...transactions, newTx]);
      
      // Reset form
      setName('');
      setAmount('');
      setPending(false);
    } catch (e) {
      console.error('Error adding IR expense:', e);
    }
  };

  const togglePendingStatus = async (id: string, currentPending: boolean) => {
    try {
      const nextPending = !currentPending;
      await financasApi.updateTransaction(id, { pending: nextPending });
      onUpdateTransactions(transactions.map(t => t.id === id ? { ...t, pending: nextPending } : t));
    } catch (e) {
      console.error('Error toggling pending status:', e);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este lançamento do Imposto de Renda?')) return;
    try {
      await financasApi.deleteTransaction(id);
      onUpdateTransactions(transactions.filter(t => t.id !== id));
    } catch (e) {
      console.error('Error deleting IR expense:', e);
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12 animate-in fade-in duration-500">


      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
          <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-1">Total Deduções Declaradas</p>
          <p className="text-2xl font-black text-emerald-500">{formatCurrency(totalDeductions)}</p>
        </div>
        <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
          <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-1">Total Pago</p>
          <p className="text-2xl font-black text-blue-500">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
          <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-1">Total A Pagar</p>
          <p className="text-2xl font-black text-amber-500">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de lançamentos (2/3 colunas) */}
        <div className="lg:col-span-2 space-y-4">
          {sortedYears.length === 0 ? (
            <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden p-12 text-center">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Nenhuma despesa dedutível encontrada.</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Use o formulário ao lado para adicionar despesas médicas, educacionais, entre outras dedutíveis.
              </p>
            </div>
          ) : (
            sortedYears.map(year => {
              const yearTxs = transactionsByYear[year];
              const yearTotal = yearTxs.reduce((acc, t) => acc + t.amount, 0);
              const yearPaid = yearTxs.filter(t => !t.pending).reduce((acc, t) => acc + t.amount, 0);
              const yearPending = yearTxs.filter(t => t.pending).reduce((acc, t) => acc + t.amount, 0);

              return (
                <div key={year} className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden mb-6">
                  <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/20 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="text-emerald-500" size={16} />
                      <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                        Ano-Calendário {year}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                      <span className="bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg">
                        Deduções: {formatCurrency(yearTotal)}
                      </span>
                      <span className="bg-blue-100/50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-lg">
                        Pago: {formatCurrency(yearPaid)}
                      </span>
                      {yearPending > 0 && (
                        <span className="bg-amber-100/50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-lg">
                          Pendente: {formatCurrency(yearPending)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10">
                          <th className="py-2.5 px-4">Nome</th>
                          <th className="py-2.5 px-4">Categoria</th>
                          <th className="py-2.5 px-4">Valor</th>
                          <th className="py-2.5 px-4">Data</th>
                          <th className="py-2.5 px-4">Forma de Pagamento</th>
                          <th className="py-2.5 px-4">Situação</th>
                          <th className="py-2.5 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {yearTxs.map(t => {
                          const cleanName = t.name.replace(/^\[IR\]\s*/, '');
                          return (
                            <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors">
                              <td className="py-3 px-4 font-bold text-zinc-800 dark:text-white">
                                {cleanName}
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                  {t.category}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-black dark:text-white">
                                {formatCurrency(t.amount)}
                              </td>
                              <td className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">
                                {formatDate(t.date)}
                              </td>
                              <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-semibold">
                                {t.paymentMethod || '—'}
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => togglePendingStatus(t.id, !!t.pending)}
                                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-colors ${
                                    t.pending
                                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
                                      : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                                  }`}
                                >
                                  {t.pending ? <Clock size={10} /> : <CheckCircle size={10} />}
                                  {t.pending ? 'A pagar' : 'Pago'}
                                </button>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleDeleteExpense(t.id)}
                                  className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"
                                  title="Excluir despesa"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
          
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-4 flex items-start gap-3">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium">
              <p className="font-bold mb-0.5">Dica sobre dedutibilidade</p>
              <p>Despesas médicas, planos de saúde, mensalidades escolares e contribuições de previdência privada costumam ser elegíveis para deduções fiscais. Lembre-se de guardar os comprovantes fiscais correspondentes.</p>
            </div>
          </div>
        </div>

        {/* Formulário de adicionar (1/3 coluna) */}
        <div>
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Nova Despesa Dedutível
            </h3>

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Nome do Gasto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Consulta Dr. Roberto, Escola do Filho"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-800 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-650"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Valor (R$)</label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-800 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-650"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Data</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-800 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-650"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Categoria</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-650 cursor-pointer"
                >
                  {outCategories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Imposto de Renda">Imposto de Renda</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-650 cursor-pointer"
                >
                  {paymentMethods.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between py-1 bg-zinc-50 dark:bg-zinc-950 px-3 border border-zinc-200 dark:border-zinc-850 rounded-xl">
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Situação</span>
                <div className="flex bg-zinc-200 dark:bg-zinc-900 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setPending(true)}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors ${
                      pending ? 'bg-amber-500 text-white shadow-sm' : 'text-zinc-500'
                    }`}
                  >
                    A pagar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPending(false)}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors ${
                      !pending ? 'bg-emerald-500 text-white shadow-sm' : 'text-zinc-500'
                    }`}
                  >
                    Pago
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-98"
              >
                <Plus size={14} /> Adicionar Lançamento
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
