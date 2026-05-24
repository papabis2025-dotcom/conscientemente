import { supabase } from '../estudos/services/supabase';
import { HealthActivity } from './App';

export const saudeApi = {
  list: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from('saude_treinos').select('*').eq('user_id', user.id);
    if (error) throw error;
    return (data || []).map(t => ({
      id: t.id,
      type: t.type,
      date: t.date,
      timeInMinutes: t.time_in_minutes,
      status: t.status,
      distanceKm: t.distance_km,
      level: t.cardio_level,
      muscles: t.muscles
    })) as HealthActivity[];
  },
  
  create: async (activity: HealthActivity) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('saude_treinos').insert({
      id: activity.id,
      user_id: user.id,
      type: activity.type,
      date: activity.date,
      time_in_minutes: activity.timeInMinutes,
      status: activity.status,
      distance_km: activity.distanceKm,
      cardio_level: activity.level,
      muscles: activity.muscles
    });
    if (error) throw error;
  },

  update: async (id: string, updates: Partial<HealthActivity>) => {
    const payload: any = {};
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.timeInMinutes !== undefined) payload.time_in_minutes = updates.timeInMinutes;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.distanceKm !== undefined) payload.distance_km = updates.distanceKm;
    if (updates.level !== undefined) payload.cardio_level = updates.level;
    if (updates.muscles !== undefined) payload.muscles = updates.muscles;
    
    const { error } = await supabase.from('saude_treinos').update(payload).eq('id', id);
    if (error) throw error;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('saude_treinos').delete().eq('id', id);
    if (error) throw error;
  }
};
