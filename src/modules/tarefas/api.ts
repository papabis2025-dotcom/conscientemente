import { supabase } from '../estudos/services/supabase';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
  dueTime: string;
  category: string;
  createdAt: number;
  recurrenceType?: 'none' | 'days' | 'monthly';
  recurrenceValue?: number;
  endDate?: string;
}

export const tarefasApi = {
  list: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from('tarefas').select('*').eq('user_id', user.id);
    if (error) throw error;
    return (data || []).map(t => {
      let endDate: string | undefined = undefined;
      let dueTime = t.due_time || '';
      if (dueTime.startsWith('range:')) {
        endDate = dueTime.substring(6);
        dueTime = '';
      }
      return {
        id: t.id,
        text: t.text,
        completed: t.completed,
        dueDate: t.due_date,
        dueTime: dueTime,
        endDate: endDate,
        category: t.category,
        createdAt: t.created_at,
        recurrenceType: t.recurrence_type,
        recurrenceValue: t.recurrence_value
      };
    }) as Task[];
  },
  
  create: async (task: Task) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('tarefas').insert({
      id: task.id,
      user_id: user.id,
      text: task.text,
      completed: task.completed,
      due_date: task.dueDate,
      due_time: task.dueTime,
      category: task.category,
      created_at: task.createdAt,
      recurrence_type: task.recurrenceType,
      recurrence_value: task.recurrenceValue
    });
    if (error) throw error;
  },

  update: async (id: string, updates: Partial<Task>) => {
    const payload: any = {};
    if (updates.completed !== undefined) payload.completed = updates.completed;
    if (updates.text !== undefined) payload.text = updates.text;
    if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
    if (updates.dueTime !== undefined) payload.due_time = updates.dueTime;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.recurrenceType !== undefined) payload.recurrence_type = updates.recurrenceType;
    if (updates.recurrenceValue !== undefined) payload.recurrence_value = updates.recurrenceValue;
    
    const { error } = await supabase.from('tarefas').update(payload).eq('id', id);
    if (error) throw error;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('tarefas').delete().eq('id', id);
    if (error) throw error;
  },

  clearCompleted: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('tarefas').delete().eq('user_id', user.id).eq('completed', true);
    if (error) throw error;
  }
};
