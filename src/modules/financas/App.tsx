import React, { useState, useEffect, useMemo } from 'react';
import { LayoutTemplate, Wallet, TrendingUp, TrendingDown, CreditCard, ChevronLeft, ChevronRight, Trash2, Calendar, PieChart as PieChartIcon, Edit3, Menu, RefreshCw, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { financasApi } from './api';
import { ParcelasRecorrencia } from './ParcelasRecorrencia';
import { ImpostoRenda } from './ImpostoRenda';

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
  const [activeTab, setActiveTabState] = useState<'dashboard' | 'anual' | 'recorrencia' | 'imposto' | 'ajustes'>(() => {
    return (localStorage.getItem('financas_active_tab') as any) || 'dashboard';
  });

  const setActiveTab = (tab: 'dashboard' | 'anual' | 'recorrencia' | 'imposto' | 'ajustes') => {
    setActiveTabState(tab);
    localStorage.setItem('financas_active_tab', tab);
    window.dispatchEvent(new Event('local-settings-changed'));
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('isSidebarCollapsed_financas') !== 'false';
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
  const [txIsIR, setTxIsIR] = useState(false);
  const [txInstallments, setTxInstallments] = useState(''); // total number of installments
  const [txInstallmentNum, setTxInstallmentNum] = useState(''); // current installment being paid
  const [txRecurrent, setTxRecurrent] = useState(false);
  const [txRecurrences, setTxRecurrences] = useState('');
  const [txUntilCancelled, setTxUntilCancelled] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'cartoes' | 'saidas' | 'entradas'>('cartoes');
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    txId: string;
    isInstallment: boolean;
    isRecurring: boolean;
    baseName?: string;
    totalInst?: string;
  } | null>(null);

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

  const [inSort, setInSort] = useState<'date'|'value'|'category'|'name'>('date');
  const [outSort, setOutSort] = useState<'date'|'value'|'category'|'name'>('date');
  const [paymentSort, setPaymentSort] = useState<'value'|'type'>('value');
  const [categorySort, setCategorySort] = useState<'value'|'type'>('value');
  const [inStatusFilter, setInStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [outStatusFilter, setOutStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');

  // localStorage triggers removed

  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(currentMonthStr));
  }, [transactions, currentMonthStr]);

  const unfilteredEntradas = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'entrada');
  }, [monthTransactions]);

  const unfilteredSaidas = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'saida');
  }, [monthTransactions]);

  const totalEntradas = useMemo(() => unfilteredEntradas.reduce((acc, t) => acc + t.amount, 0), [unfilteredEntradas]);
  const totalSaidas = useMemo(() => unfilteredSaidas.reduce((acc, t) => acc + t.amount, 0), [unfilteredSaidas]);
  const saldo = totalEntradas - totalSaidas;

  const totalEntradasPendentes = useMemo(() => unfilteredEntradas.filter(t => t.pending).reduce((acc, t) => acc + t.amount, 0), [unfilteredEntradas]);
  const totalSaidasPendentes = useMemo(() => unfilteredSaidas.filter(t => t.pending).reduce((acc, t) => acc + t.amount, 0), [unfilteredSaidas]);

  const entradas = useMemo(() => {
    let filtered = monthTransactions.filter(t => t.type === 'entrada');
    if (inStatusFilter === 'pending') {
      filtered = filtered.filter(t => t.pending);
    } else if (inStatusFilter === 'paid') {
      filtered = filtered.filter(t => !t.pending);
    }
    let sorted = [...filtered];
    if (inSort === 'date') sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (inSort === 'value') sorted.sort((a, b) => b.amount - a.amount);
    if (inSort === 'category') sorted.sort((a, b) => a.category.localeCompare(b.category));
    if (inSort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [monthTransactions, inSort, inStatusFilter]);

  const saidas = useMemo(() => {
    let filtered = monthTransactions.filter(t => t.type === 'saida');
    if (outStatusFilter === 'pending') {
      filtered = filtered.filter(t => t.pending);
    } else if (outStatusFilter === 'paid') {
      filtered = filtered.filter(t => !t.pending);
    }
    let sorted = [...filtered];
    if (outSort === 'date') sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (outSort === 'value') sorted.sort((a, b) => b.amount - a.amount);
    if (outSort === 'category') sorted.sort((a, b) => a.category.localeCompare(b.category));
    if (outSort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [monthTransactions, outSort, outStatusFilter]);

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
    const nameWithoutPrefixes = t.name.replace(/^\[IR\]\s*/, '').replace(/^\[AC\]\s*/, '');
    setTxName(nameWithoutPrefixes);
    setTxIsIR(t.name.startsWith('[IR]'));
    setTxUntilCancelled(t.name.startsWith('[AC]'));
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
    setTxRecurrent(false);
    setTxRecurrences('');

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
    setTxIsIR(false);
    setTxUntilCancelled(false);
    setTxInstallments('');
    setTxInstallmentNum('');
    setTxRecurrent(false);
    setTxRecurrences('');
  };

  // Helper: add months to a YYYY-MM-DD date string
  const addMonthsToDate = (dateStr: string, months: number): string => {
    const d = new Date(dateStr + 'T12:00:00'); // use noon to avoid DST issues
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
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
      let formattedName = txIsIR ? (txName.startsWith('[IR]') ? txName : `[IR] ${txName}`) : (txName.startsWith('[IR]') ? txName.replace(/^\[IR\]\s*/, '') : txName);
      formattedName = txUntilCancelled ? (formattedName.startsWith('[AC]') ? formattedName : `[AC] ${formattedName}`) : (formattedName.startsWith('[AC]') ? formattedName.replace(/^\[AC\]\s*/, '') : formattedName);
      const updatedTx: Transaction = {
        id: editingTxId,
        type: txType,
        name: formattedName,
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
      setTxIsIR(false);
      setTxUntilCancelled(false);
    } else {
      const totalParcelas = parseInt(txInstallments) || 0;
      const currentParcela = parseInt(txInstallmentNum) || 0;
      const isParcelado = txType === 'saida' && totalParcelas > 1 && currentParcela >= 1 && currentParcela <= totalParcelas;

      const isPixOrDinheiro = txMethod?.toLowerCase().includes('pix') || txMethod?.toLowerCase().includes('dinheiro');
      const totalRecurrencias = txRecurrent && isPixOrDinheiro ? (parseInt(txRecurrences) || 0) : 0;
      const isRecorrente = txType === 'saida' && totalRecurrencias > 1;

      let baseTxName = txIsIR ? (txName.startsWith('[IR]') ? txName : `[IR] ${txName}`) : txName;
      if (txUntilCancelled) {
        baseTxName = baseTxName.startsWith('[AC]') ? baseTxName : `[AC] ${baseTxName}`;
      }
      
      // Build base name: append parcel label if parcelado or recurrent
      let baseName = baseTxName;
      if (isParcelado) {
        baseName = `${baseTxName} (${currentParcela}/${totalParcelas})`;
      } else if (isRecorrente) {
        baseName = `${baseTxName} (1/${totalRecurrencias})`;
      }

      const t: Transaction = {
        id: crypto.randomUUID(),
        type: txType,
        name: baseName,
        amount: amountNum,
        category: txCategory,
        date: finalDate,
        pending: txPending,
        dayOnly,
        ...(txType === 'saida' ? { paymentMethod: txMethod } : {})
      };

      financasApi.createTransaction(t).catch(err => console.error('Error creating transaction:', err));
      const newTransactions: Transaction[] = [t];

      // Generate future installments
      if (isParcelado) {
        const remainingParcelas = totalParcelas - currentParcela;
        for (let i = 1; i <= remainingParcelas; i++) {
          const futureDate = addMonthsToDate(finalDate, i);
          const futureParcelNum = currentParcela + i;
          const futureTx: Transaction = {
            id: crypto.randomUUID(),
            type: txType,
            name: `${baseTxName} (${futureParcelNum}/${totalParcelas})`,
            amount: amountNum,
            category: txCategory,
            date: futureDate,
            pending: txPending, // follow base transaction pending status
            dayOnly,
            ...(txType === 'saida' ? { paymentMethod: txMethod } : {})
          };
          financasApi.createTransaction(futureTx).catch(err => console.error('Error creating installment:', err));
          newTransactions.push(futureTx);
        }
      }

      // Generate future recurring transactions for Pix/Dinheiro
      if (isRecorrente) {
        for (let i = 1; i < totalRecurrencias; i++) {
          const futureDate = addMonthsToDate(finalDate, i);
          const futureTx: Transaction = {
            id: crypto.randomUUID(),
            type: txType,
            name: `${baseTxName} (${i + 1}/${totalRecurrencias})`,
            amount: amountNum,
            category: txCategory,
            date: futureDate,
            pending: txPending, // follow base transaction pending status
            dayOnly,
            ...(txType === 'saida' ? { paymentMethod: txMethod } : {})
          };
          financasApi.createTransaction(futureTx).catch(err => console.error('Error creating recurring transaction:', err));
          newTransactions.push(futureTx);
        }
      }

      // Generate future AC (Until Cancelled) transactions for the next 11 months
      if (txUntilCancelled) {
        for (let i = 1; i <= 11; i++) {
          const futureDate = addMonthsToDate(finalDate, i);
          const futureTx: Transaction = {
            id: crypto.randomUUID(),
            type: txType,
            name: baseName,
            amount: amountNum,
            category: txCategory,
            date: futureDate,
            pending: txPending, // follow base transaction pending status
            dayOnly,
            ...(txType === 'saida' ? { paymentMethod: txMethod } : {})
          };
          financasApi.createTransaction(futureTx).catch(err => console.error('Error creating AC transaction:', err));
          newTransactions.push(futureTx);
        }
      }

      setTransactions(prev => [...prev, ...newTransactions]);
      setTxName('');
      setTxAmount('');
      setTxDate('');
      setTxPending(false);
      setTxIsIR(false);
      setTxUntilCancelled(false);
      setTxInstallments('');
      setTxInstallmentNum('');
      setTxRecurrent(false);
      setTxRecurrences('');
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

  const toggleImpostoRenda = (id: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        const isIR = t.name.startsWith('[IR]');
        const newName = isIR ? t.name.replace(/^\[IR\]\s*/, '') : `[IR] ${t.name}`;
        financasApi.updateTransaction(id, { name: newName }).catch(err => console.error('Error updating transaction name for IR:', err));
        return { ...t, name: newName };
      }
      return t;
    }));
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const isPixOrDinheiro = tx.paymentMethod?.toLowerCase().includes('pix') || tx.paymentMethod?.toLowerCase().includes('dinheiro');
    const installmentMatch = tx.name.match(/(.+?)\s*\(?(\d+)\/(\d+)\)?$/);
    const isRecurring = isPixOrDinheiro && transactions.some(t => t.id !== id && t.name === tx.name && t.amount === tx.amount && t.category === tx.category && t.type === tx.type);

    if (installmentMatch) {
      const [_, baseName, currentInst, totalInst] = installmentMatch;
      setDeleteModalConfig({
        isOpen: true,
        txId: id,
        isInstallment: true,
        isRecurring: false,
        baseName,
        totalInst
      });
    } else if (isRecurring) {
      setDeleteModalConfig({
        isOpen: true,
        txId: id,
        isInstallment: false,
        isRecurring: true,
        baseName: tx.name
      });
    } else {
      if (confirm('Tem certeza que deseja excluir este lançamento?')) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        financasApi.deleteTransaction(id).catch(err => console.error('Error deleting transaction:', err));
      }
    }
  };

  const executeDeleteSingle = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    financasApi.deleteTransaction(id).catch(err => console.error('Error deleting transaction:', err));
    setDeleteModalConfig(null);
  };

  const executeDeleteAll = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    let toDelete: Transaction[] = [];

    const installmentMatch = tx.name.match(/(.+?)\s*\(?(\d+)\/(\d+)\)?$/);
    if (installmentMatch) {
      const [_, baseName, __, totalInst] = installmentMatch;
      toDelete = transactions.filter(t => {
        const m = t.name.match(/(.+?)\s*\(?(\d+)\/(\d+)\)?$/);
        return m && m[1] === baseName && m[3] === totalInst && t.amount === tx.amount && t.category === tx.category && t.type === tx.type;
      });
    } else {
      toDelete = transactions.filter(t => t.name === tx.name && t.amount === tx.amount && t.category === tx.category && t.type === tx.type && t.paymentMethod === tx.paymentMethod);
    }

    const idsToDelete = toDelete.map(t => t.id);
    setTransactions(prev => prev.filter(t => !idsToDelete.includes(t.id)));

    for (const deleteId of idsToDelete) {
      financasApi.deleteTransaction(deleteId).catch(err => console.error('Error deleting transaction in bulk:', err));
    }

    setDeleteModalConfig(null);
  };

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });

  return (
    <div className="flex h-screen bg-transparent text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden relative">
      
      {/* Backdrop for mobile when sidebar is open */}
      {!isSidebarCollapsed && (
        <div 
          onClick={() => setIsSidebarCollapsed(true)}
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200" 
        />
      )}

      {/* Floating Menu Button on Mobile */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="md:hidden fixed bottom-6 left-6 z-40 w-10 h-10 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer animate-in zoom-in duration-200"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Sidebar Lateral */}
      <aside className={`fixed md:relative z-50 md:z-20 h-screen bg-white/95 dark:bg-zinc-900/95 md:bg-white/50 md:dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 backdrop-blur-xl shrink-0 ${isSidebarCollapsed ? 'w-64 md:w-20 -translate-x-full md:translate-x-0' : 'w-64 translate-x-0'}`}>
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
                onClick={() => setActiveTab('recorrencia')} 
                className={`rounded-xl flex items-center transition-all text-xs font-bold uppercase tracking-wider ${isSidebarCollapsed ? 'justify-center p-3' : 'p-3 gap-3'} ${activeTab === 'recorrencia' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-zinc-500 hover:bg-white dark:hover:bg-zinc-800'}`}
                title={isSidebarCollapsed ? 'Parcelamento e Recorrência' : ''}
              >
                <RefreshCw size={16} className="shrink-0" />
                {!isSidebarCollapsed && <span>Parcelamento e Recorrência</span>}
              </button>
              <button 
                onClick={() => setActiveTab('imposto')} 
                className={`rounded-xl flex items-center transition-all text-xs font-bold uppercase tracking-wider ${isSidebarCollapsed ? 'justify-center p-3' : 'p-3 gap-3'} ${activeTab === 'imposto' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-zinc-500 hover:bg-white dark:hover:bg-zinc-800'}`}
                title={isSidebarCollapsed ? 'Imposto de Renda' : ''}
              >
                <FileText size={16} className="shrink-0" />
                {!isSidebarCollapsed && <span>Imposto de Renda</span>}
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
      <main className="flex-1 p-6 overflow-hidden flex flex-col bg-transparent">
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
        ) : activeTab === 'recorrencia' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ParcelasRecorrencia 
              transactions={transactions}
              onUpdateTransactions={setTransactions}
            />
          </div>
        ) : activeTab === 'imposto' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ImpostoRenda 
              transactions={transactions}
              onUpdateTransactions={setTransactions}
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
                <div className="flex items-baseline justify-between gap-1 flex-wrap">
                  <p className="text-sm font-bold dark:text-white">{formatCurrency(totalEntradas)}</p>
                  <span className="text-[9px] text-amber-500 font-semibold" title="Valor marcado como pendente">
                    {formatCurrency(totalEntradasPendentes)} pend.
                  </span>
                </div>
              </div>
              <div className="bg-white dark:bg-[#121214] p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-2 text-rose-500 mb-0.5">
                  <TrendingDown size={14} /><span className="text-[9px] font-bold uppercase tracking-wider">Saídas</span>
                </div>
                <div className="flex items-baseline justify-between gap-1 flex-wrap">
                  <p className="text-sm font-bold dark:text-white">{formatCurrency(totalSaidas)}</p>
                  <span className="text-[9px] text-amber-500 font-semibold" title="Valor marcado como pendente">
                    {formatCurrency(totalSaidasPendentes)} pend.
                  </span>
                </div>
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
                  <>
                  <div className="flex flex-col gap-1 animate-in slide-in-from-top-1 duration-150">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Forma de Pagamento</label>
                    <select 
                      value={txMethod} 
                      onChange={e => {
                        setTxMethod(e.target.value);
                        // Reset recurrence if payment method changes to non-cash/pix
                        const isPixOrDinheiro = e.target.value?.toLowerCase().includes('pix') || e.target.value?.toLowerCase().includes('dinheiro');
                        if (!isPixOrDinheiro) {
                          setTxRecurrent(false);
                          setTxRecurrences('');
                        }
                      }} 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer dark:text-white font-semibold"
                    >
                      {paymentMethods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>

                  {/* Até o Cancelamento */}
                  {!editingTxId && (
                    <div className="flex flex-col gap-1 animate-in slide-in-from-top-1 duration-150">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={txUntilCancelled} 
                          onChange={e => {
                            setTxUntilCancelled(e.target.checked);
                            if (e.target.checked) {
                              setTxRecurrent(false);
                              setTxRecurrences('');
                              setTxInstallments('');
                              setTxInstallmentNum('');
                            }
                          }}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-rose-500 focus:ring-rose-500"
                        />
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">Até o cancelamento? (Netflix, Internet, etc.)</span>
                      </label>
                      {txUntilCancelled && (
                        <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                          ✦ 12 meses de lançamentos pendentes serão gerados automaticamente.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Recorrência (Pix/Dinheiro) */}
                  {(txMethod?.toLowerCase().includes('pix') || txMethod?.toLowerCase().includes('dinheiro')) && !editingTxId && !txUntilCancelled && (
                    <div className="flex flex-col gap-1 animate-in slide-in-from-top-1 duration-150">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Recorrência</label>
                      <div className="flex gap-2 items-center">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={txRecurrent} 
                            onChange={e => {
                              setTxRecurrent(e.target.checked);
                              if (!e.target.checked) setTxRecurrences('');
                            }}
                            className="rounded border-zinc-300 dark:border-zinc-700 text-rose-500 focus:ring-rose-500"
                          />
                          <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">Repetir transação?</span>
                        </label>
                        {txRecurrent && (
                          <div className="flex-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-150">
                            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase whitespace-nowrap">por</span>
                            <input
                              type="number"
                              min="2"
                              placeholder="Ex: 12"
                              value={txRecurrences}
                              onChange={e => setTxRecurrences(e.target.value)}
                              className="w-20 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-rose-500 dark:text-white font-semibold"
                            />
                            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase font-bold">meses</span>
                          </div>
                        )}
                      </div>
                      {txRecurrent && txRecurrences && parseInt(txRecurrences) > 1 && (
                        <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                          ✦ {parseInt(txRecurrences) - 1} transação(ões) futura(s) recorrente(s) serão geradas automaticamente
                        </p>
                      )}
                    </div>
                  )}

                  {/* Parcelamento */}
                  {!editingTxId && !txRecurrent && !txUntilCancelled && (
                  <div className="flex flex-col gap-1 animate-in slide-in-from-top-1 duration-150">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Parcelado? (opcional)</label>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 flex flex-col gap-0.5">
                        <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold">Parcela atual</span>
                        <input
                          type="number"
                          min="1"
                          placeholder="Ex: 2"
                          value={txInstallmentNum}
                          onChange={e => setTxInstallmentNum(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 dark:text-white font-semibold"
                        />
                      </div>
                      <span className="text-zinc-400 dark:text-zinc-500 font-black text-sm mt-4">/</span>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold">Total de parcelas</span>
                        <input
                          type="number"
                          min="2"
                          placeholder="Ex: 10"
                          value={txInstallments}
                          onChange={e => setTxInstallments(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 dark:text-white font-semibold"
                        />
                      </div>
                    </div>
                    {txInstallments && txInstallmentNum && parseInt(txInstallments) > 1 && parseInt(txInstallmentNum) >= 1 && parseInt(txInstallmentNum) <= parseInt(txInstallments) && (
                      <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                        ✦ {parseInt(txInstallments) - parseInt(txInstallmentNum)} parcela(s) futura(s) serão geradas automaticamente
                      </p>
                    )}
                  </div>
                  )}
                  </>
                )}

                {txType === 'saida' && (
                  <button 
                    type="button" 
                    onClick={() => setTxIsIR(!txIsIR)} 
                    className={`w-full border rounded-lg py-2 text-[9px] font-black uppercase tracking-wider transition-colors mb-2 flex items-center justify-center gap-1.5 ${txIsIR ? 'bg-rose-100 text-rose-750 border-rose-200 dark:bg-rose-500/10 dark:text-rose-450 dark:border-rose-500/20' : 'bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/55'}`}
                  >
                    <FileText size={12} />
                    {txIsIR ? 'Dedutível Imposto de Renda (IR)' : 'Marcar como Dedutível IR'}
                  </button>
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
                <div className="flex items-center gap-2">
                  <select value={inStatusFilter} onChange={e => setInStatusFilter(e.target.value as any)} className="text-[9px] uppercase font-bold tracking-wider bg-transparent text-zinc-400 outline-none cursor-pointer">
                    <option value="all">Status: Todos</option>
                    <option value="pending">Status: Pendente</option>
                    <option value="paid">Status: Pago</option>
                  </select>
                  <span className="text-zinc-300 dark:text-zinc-700 text-[10px]">•</span>
                  <select value={inSort} onChange={e => setInSort(e.target.value as any)} className="text-[9px] uppercase font-bold tracking-wider bg-transparent text-zinc-400 outline-none cursor-pointer">
                    <option value="date">Data</option>
                    <option value="value">Valor</option>
                    <option value="category">Categ</option>
                    <option value="name">Nome</option>
                  </select>
                </div>
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                              {t.name.replace(/^\[IR\]\s*/, '').replace(/^\[AC\]\s*/, '')}
                            </p>
                            {t.name.startsWith('[IR]') && (
                              <span className="text-[8px] font-black uppercase tracking-wider px-1 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded leading-none px-1.5 py-0.5">
                                IR
                              </span>
                            )}
                            {t.name.startsWith('[AC]') && (
                              <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 leading-none">
                                Fixo
                              </span>
                            )}
                          </div>
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
                <div className="flex items-center gap-2">
                  <select value={outStatusFilter} onChange={e => setOutStatusFilter(e.target.value as any)} className="text-[9px] uppercase font-bold tracking-wider bg-transparent text-zinc-400 outline-none cursor-pointer">
                    <option value="all">Status: Todos</option>
                    <option value="pending">Status: Pendente</option>
                    <option value="paid">Status: Pago</option>
                  </select>
                  <span className="text-zinc-300 dark:text-zinc-700 text-[10px]">•</span>
                  <select value={outSort} onChange={e => setOutSort(e.target.value as any)} className="text-[9px] uppercase font-bold tracking-wider bg-transparent text-zinc-400 outline-none cursor-pointer">
                    <option value="date">Data</option>
                    <option value="value">Valor</option>
                    <option value="category">Categ</option>
                    <option value="name">Nome</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {saidas.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center py-20 text-zinc-400 text-xs font-semibold">
                  Nenhuma saída este mês.
                </div>
              ) : (
                <ul className="space-y-1.5">
                      {saidas.map(t => {
                    // Detect last installment: name matches "X/Y" pattern where X === Y
                    const installMatch = t.name.match(/(.+?)\s*\(?(\d+)\/(\d+)\)?$/);
                    const isLastInstallment = installMatch ? installMatch[2] === installMatch[3] : false;
                    // Detect last recurrence: same name/amount/category, no future occurrences
                    const isPixOrDinheiro = t.paymentMethod?.toLowerCase().includes('pix') || t.paymentMethod?.toLowerCase().includes('dinheiro');
                    const isLastRecurring = !installMatch && isPixOrDinheiro && (() => {
                      const sameGroup = transactions.filter(tx => 
                        tx.name === t.name && tx.amount === t.amount && tx.category === t.category && tx.type === t.type
                      );
                      if (sameGroup.length < 2) return false;
                      const sorted = [...sameGroup].sort((a, b) => a.date.localeCompare(b.date));
                      return sorted[sorted.length - 1].id === t.id;
                    })();
                    const isLastPayment = isLastInstallment || isLastRecurring;
                    return (
                    <li key={t.id} className={`group flex items-center justify-between p-2 rounded-xl transition-colors border ${isLastPayment ? 'bg-amber-50/70 dark:bg-amber-900/15 border-amber-300/50 dark:border-amber-600/40 hover:bg-amber-50 dark:hover:bg-amber-900/25' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/55 border-transparent hover:border-zinc-100 dark:hover:border-zinc-800'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ${isLastPayment ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                          {t.dayOnly ? t.date.split('-')[2] : new Date(`${t.date}T12:00:00`).getDate()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                              {t.name.replace(/^\[IR\]\s*/, '').replace(/^\[AC\]\s*/, '')}
                            </p>
                            {t.name.includes('[IR]') && (
                              <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-455 border border-rose-200/50 dark:border-rose-800/40 leading-none">
                                IR
                              </span>
                            )}
                            {t.name.includes('[AC]') && (
                              <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-650 dark:text-blue-455 border border-blue-200/50 dark:border-blue-800/40 leading-none">
                                Fixo
                              </span>
                            )}
                            {isLastPayment && (
                              <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-400/20 dark:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-300/50 dark:border-amber-500/40 leading-none">
                                {isLastInstallment ? 'Última Parcela' : 'Última Recorrência'}
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 flex gap-1.5">
                            <span>{t.category}</span>
                            <span className="text-zinc-300 dark:text-zinc-700">•</span>
                            <span>{t.paymentMethod}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleImpostoRenda(t.id)} 
                          className={`p-1 rounded-lg transition-colors ${t.name.startsWith('[IR]') ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 opacity-100' : 'text-zinc-450 hover:text-rose-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100'}`} 
                          title={t.name.startsWith('[IR]') ? 'Remover do Imposto de Renda' : 'Enviar para Imposto de Renda'}
                        >
                          <FileText size={14}/>
                        </button>
                        <button onClick={() => togglePending(t.id)} className={`p-1 rounded-lg transition-colors ${t.pending ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950 opacity-100' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 opacity-0 group-hover:opacity-100'}`} title={t.pending ? 'Pendente (Clique para Efetivar)' : 'Efetivado (Clique para Pendente)'}>
                          <TrendingDown size={14}/>
                        </button>
                        <span className={`font-bold text-xs ${t.pending ? 'text-amber-500' : 'text-rose-500'}`}>{formatCurrency(t.amount)}</span>
                        <button onClick={() => startEditTransaction(t)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-blue-500 p-1" title="Editar"><Edit3 size={14}/></button>
                        <button onClick={() => deleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 p-1" title="Excluir"><Trash2 size={14}/></button>
                      </div>
                    </li>
                    );
                   })}
                 </ul>
              )}

            </div>
          </section>

          </div>
        )}
      </main>
      {deleteModalConfig?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-base font-black text-zinc-950 dark:text-white mb-2 uppercase tracking-wider">
              Excluir Lançamento
            </h3>
            
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed font-semibold">
              {deleteModalConfig.isInstallment ? (
                <>Este lançamento faz parte de um parcelamento no cartão de crédito (<strong>{deleteModalConfig.baseName}</strong>). Deseja excluir apenas esta parcela ou todas as parcelas geradas?</>
              ) : (
                <>Este lançamento é um pagamento recorrente (<strong>{deleteModalConfig.baseName}</strong>). Deseja excluir apenas esta transação ou todas as recorrentes com mesmo nome e valor?</>
              )}
            </p>
            
            <div className="flex flex-col gap-2">
              <button 
                type="button"
                onClick={() => executeDeleteSingle(deleteModalConfig.txId)}
                className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors border border-zinc-200 dark:border-zinc-700"
              >
                Excluir Apenas Selecionado
              </button>
              <button 
                type="button"
                onClick={() => executeDeleteAll(deleteModalConfig.txId)}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-500/10"
              >
                Excluir Todos os Gerados
              </button>
              <button 
                type="button"
                onClick={() => setDeleteModalConfig(null)}
                className="w-full py-3 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-950 text-zinc-500 dark:text-zinc-400 rounded-xl font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancasApp;
