import { supabase } from '../estudos/services/supabase';

export interface FinCategoria {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  date: string;
  dayOnly?: boolean;
  name: string;
  amount: number;
  category: string;
  paymentMethod?: string;
  pending?: boolean;
}

export const financasApi = {
  listTransactions: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from('financas_transacoes').select('*').eq('user_id', user.id);
    if (error) throw error;
    return (data || []).map(t => ({
      id: t.id,
      type: t.type,
      date: t.date,
      dayOnly: t.day_only,
      name: t.name,
      amount: Number(t.amount),
      category: t.category,
      paymentMethod: t.payment_method,
      pending: t.pending
    })) as Transaction[];
  },
  
  createTransaction: async (t: Transaction) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('financas_transacoes').insert({
      id: t.id,
      user_id: user.id,
      type: t.type,
      date: t.date,
      day_only: t.dayOnly,
      name: t.name,
      amount: t.amount,
      category: t.category,
      payment_method: t.paymentMethod,
      pending: t.pending
    });
    if (error) throw error;
  },

  updateTransaction: async (id: string, updates: Partial<Transaction>) => {
    const payload: any = {};
    if (updates.pending !== undefined) payload.pending = updates.pending;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.dayOnly !== undefined) payload.day_only = updates.dayOnly;
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
    
    const { error } = await supabase.from('financas_transacoes').update(payload).eq('id', id);
    if (error) throw error;
  },

  deleteTransaction: async (id: string) => {
    const { error } = await supabase.from('financas_transacoes').delete().eq('id', id);
    if (error) throw error;
  },

  loadConfig: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('fin_in_categories, fin_out_categories, fin_payment_methods')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  saveConfig: async (configs: {
    fin_in_categories?: FinCategoria[];
    fin_out_categories?: FinCategoria[];
    fin_payment_methods?: FinCategoria[];
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('user_preferences').upsert({
      user_id: user.id,
      ...configs
    }, { onConflict: 'user_id' });
    if (error) throw error;
  }
};
