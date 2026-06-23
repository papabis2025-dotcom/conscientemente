import React, { useState } from 'react';
import { Transaction } from './api';
import { Calendar, CreditCard, RefreshCw, CheckCircle, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { financasApi } from './api';

interface ParcelasRecorrenciaProps {
  transactions: Transaction[];
  onUpdateTransactions: (transactions: Transaction[]) => void;
}

interface GroupedExpense {
  key: string;
  baseName: string;
  type: 'parcelamento' | 'recorrencia';
  startDate: string;
  endDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  totalCount: number;
  paidCount: number;
  items: Transaction[];
}

export const ParcelasRecorrencia: React.FC<ParcelasRecorrenciaProps> = ({ transactions, onUpdateTransactions }) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
  };

  const toggleExpand = (key: string) => {
    const newKeys = new Set(expandedKeys);
    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }
    setExpandedKeys(newKeys);
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

  const deleteTransaction = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta parcela/lançamento?')) return;
    try {
      await financasApi.deleteTransaction(id);
      onUpdateTransactions(transactions.filter(t => t.id !== id));
    } catch (e) {
      console.error('Error deleting transaction:', e);
    }
  };

  const deleteGroup = async (group: GroupedExpense) => {
    if (!window.confirm(`Tem certeza que deseja excluir TODOS os ${group.items.length} lançamentos de "${group.baseName}"?`)) return;
    try {
      for (const item of group.items) {
        await financasApi.deleteTransaction(item.id);
      }
      const idsToRemove = new Set(group.items.map(i => i.id));
      onUpdateTransactions(transactions.filter(t => !idsToRemove.has(t.id)));
    } catch (e) {
      console.error('Error deleting group:', e);
    }
  };

  // Grouping logic with flexible regex pattern for optional parentheses
  const installmentRegex = /(.*?)\s*\(?(\d+)\/(\d+)\)?$/;

  const nameCounts: { [name: string]: number } = {};
  transactions.forEach(t => {
    if (t.type === 'saida' && !t.name.match(installmentRegex)) {
      nameCounts[t.name] = (nameCounts[t.name] || 0) + 1;
    }
  });

  const grouped: { [key: string]: GroupedExpense } = {};

  transactions.forEach(t => {
    if (t.type !== 'saida') return;

    const installmentMatch = t.name.match(installmentRegex);
    if (installmentMatch) {
      const baseName = installmentMatch[1].trim();
      const key = `parcel_${baseName}_${installmentMatch[3]}`;
      if (!grouped[key]) {
        grouped[key] = {
          key,
          baseName,
          type: 'parcelamento',
          startDate: t.date,
          endDate: t.date,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          totalCount: 0,
          paidCount: 0,
          items: []
        };
      }
      grouped[key].items.push(t);
    } else if (nameCounts[t.name] > 1) {
      const key = `recorr_${t.name}`;
      if (!grouped[key]) {
        grouped[key] = {
          key,
          baseName: t.name,
          type: 'recorrencia',
          startDate: t.date,
          endDate: t.date,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          totalCount: 0,
          paidCount: 0,
          items: []
        };
      }
      grouped[key].items.push(t);
    }
  });

  const groupsList = Object.values(grouped).map(group => {
    group.items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    group.startDate = group.items[0].date;
    group.endDate = group.items[group.items.length - 1].date;
    
    if (group.type === 'parcelamento') {
      let maxTotalInst = group.items.reduce((max, item) => {
        const m = item.name.match(installmentRegex);
        if (m) {
          const total = parseInt(m[3]);
          return total > max ? total : max;
        }
        return max;
      }, 0);

      if (maxTotalInst === 0) {
        maxTotalInst = group.items.length;
      }

      const singleAmount = group.items[0]?.amount || 0;
      const pendingItemsCount = group.items.filter(item => item.pending).length;

      group.totalCount = maxTotalInst;
      group.paidCount = maxTotalInst - pendingItemsCount;
      
      group.totalAmount = singleAmount * maxTotalInst;
      group.pendingAmount = group.items.filter(item => item.pending).reduce((sum, item) => sum + item.amount, 0);
      group.paidAmount = group.totalAmount - group.pendingAmount;
    } else {
      // Recorrência
      group.totalCount = group.items.length;
      group.paidCount = group.items.filter(item => !item.pending).length;
      
      group.totalAmount = 0;
      group.paidAmount = 0;
      group.pendingAmount = 0;

      group.items.forEach(t => {
        group.totalAmount += t.amount;
        if (t.pending) {
          group.pendingAmount += t.amount;
        } else {
          group.paidAmount += t.amount;
        }
      });
    }

    return group;
  });

  // Sort groups: most recent start date first
  groupsList.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // Group groupsList by category
  const groupsByCategory: { [category: string]: GroupedExpense[] } = {};
  groupsList.forEach(group => {
    const cat = group.items[0]?.category || 'Outro';
    if (!groupsByCategory[cat]) {
      groupsByCategory[cat] = [];
    }
    groupsByCategory[cat].push(group);
  });

  const sortedCategories = Object.keys(groupsByCategory).sort((a, b) => a.localeCompare(b));

  const totalRecurrentCount = groupsList.length;
  const totalPendingAmount = groupsList.reduce((acc, g) => acc + g.pendingAmount, 0);
  const totalPaidAmount = groupsList.reduce((acc, g) => acc + g.paidAmount, 0);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white uppercase tracking-tight">
            Parcelamento e Recorrência
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Gerenciamento e controle de despesas parceladas ou com pagamento recorrente.
          </p>
        </div>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
          <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-1">Total de Contratos/Grupos</p>
          <p className="text-2xl font-black dark:text-white">{totalRecurrentCount}</p>
        </div>
        <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
          <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-1">Total Pago (Acumulado)</p>
          <p className="text-2xl font-black text-emerald-500">{formatCurrency(totalPaidAmount)}</p>
        </div>
        <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
          <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-1">Restante a Pagar</p>
          <p className="text-2xl font-black text-amber-500">{formatCurrency(totalPendingAmount)}</p>
        </div>
      </div>

      {groupsList.length === 0 ? (
        <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Nenhum gasto parcelado ou recorrente identificado.</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Lançamentos criados com parcelas ou recorrência no cartão de crédito/Pix aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedCategories.map(categoryName => {
            const categoryGroups = groupsByCategory[categoryName];
            return (
              <div key={categoryName} className="space-y-3">
                {/* Category Header Section */}
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-450">
                    {categoryName}
                  </h3>
                  <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full font-bold">
                    {categoryGroups.length} {categoryGroups.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                <div className="space-y-4">
                  {categoryGroups.map(group => {
                    const isExpanded = expandedKeys.has(group.key);
                    const paidCount = group.paidCount;
                    const totalCount = group.totalCount;
                    const progressPercent = Math.round((paidCount / totalCount) * 100) || 0;

                    return (
                      <div 
                        key={group.key}
                        className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-700/50"
                      >
                        {/* Header do Card (Geral) */}
                        <div 
                          onClick={() => toggleExpand(group.key)}
                          className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${group.type === 'parcelamento' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-500'}`}>
                              {group.type === 'parcelamento' ? <CreditCard size={18} /> : <RefreshCw size={18} />}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-zinc-800 dark:text-white">{group.baseName}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${group.type === 'parcelamento' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                  {group.type === 'parcelamento' ? 'Parcelado' : 'Recorrente'}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold flex items-center gap-1">
                                  <Calendar size={10} /> {formatDate(group.startDate)} a {formatDate(group.endDate)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Progresso & Valores */}
                          <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
                            {/* Barra de Progresso */}
                            <div className="flex flex-col gap-1 w-32">
                              <div className="flex justify-between text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                                <span>Progresso</span>
                                <span>{paidCount}/{totalCount}</span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                              </div>
                            </div>

                            {/* Valores */}
                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <p className="text-[8px] font-black uppercase text-zinc-400 dark:text-zinc-500">
                                  {group.type === 'parcelamento' ? 'Parcela Mensal' : 'Valor Mensal'}
                                </p>
                                <p className="text-xs font-extrabold text-emerald-500">{formatCurrency(group.items[0]?.amount || 0)}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black uppercase text-zinc-400 dark:text-zinc-500">Restante</p>
                                <p className="text-xs font-bold text-zinc-800 dark:text-white">{formatCurrency(group.pendingAmount)}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black uppercase text-zinc-400 dark:text-zinc-500">Total do Contrato</p>
                                <p className="text-xs font-bold text-zinc-550 dark:text-zinc-400">{formatCurrency(group.totalAmount)}</p>
                              </div>
                            </div>

                            {/* Ações */}
                            <div className="flex items-center gap-2 ml-auto md:ml-0" onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={() => deleteGroup(group)}
                                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-zinc-400 hover:text-rose-500 rounded-xl transition-colors"
                                title="Excluir Contrato Inteiro"
                              >
                                <Trash2 size={15} />
                              </button>
                              <div className="text-zinc-400 p-1">
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Lista de Parcelas Expandida */}
                        {isExpanded && (
                          <div className="border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20 p-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-2">
                                    <th className="pb-2 pl-3">Parcela</th>
                                    <th className="pb-2">Vencimento</th>
                                    <th className="pb-2">Valor</th>
                                    <th className="pb-2">Situação</th>
                                    <th className="pb-2 text-right pr-3">Ações</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                  {group.items.map((item, idx) => {
                                    const instMatch = item.name.match(/(?: \()?(\d+)\/(\d+)\)?$/);
                                    const displayNum = instMatch ? `${instMatch[1]}/${instMatch[2]}` : `#${idx + 1}`;

                                    return (
                                      <tr 
                                        key={item.id} 
                                        className={`hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 transition-colors ${
                                          !item.pending ? 'opacity-70' : ''
                                        }`}
                                      >
                                        <td className="py-2.5 pl-3 font-semibold dark:text-zinc-300">
                                          {group.type === 'parcelamento' ? `Parcela ${displayNum}` : `Lançamento ${displayNum}`}
                                        </td>
                                        <td className="py-2.5 font-medium text-zinc-500 dark:text-zinc-400">
                                          {formatDate(item.date)}
                                        </td>
                                        <td className="py-2.5 font-bold dark:text-white">
                                          {formatCurrency(item.amount)}
                                        </td>
                                        <td className="py-2.5">
                                          <button
                                            onClick={() => togglePendingStatus(item.id, !!item.pending)}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${
                                              item.pending
                                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
                                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                                            }`}
                                          >
                                            {item.pending ? (
                                              <>
                                                <Clock size={11} /> Pendente
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle size={11} /> Pago
                                              </>
                                            )}
                                          </button>
                                        </td>
                                        <td className="py-2.5 text-right pr-3">
                                          <button
                                            onClick={() => deleteTransaction(item.id)}
                                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"
                                            title="Excluir esta parcela"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
