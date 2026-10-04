import { supabase } from '../estudos/services/supabase';
import { Note, FolderItem } from './App';

const getAuthUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};

export const anotacoesApi = {
  // Listar anotações (do Supabase com fallback gracioso)
  listNotes: async (): Promise<Note[]> => {
    try {
      const user = await getAuthUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('anotacoes')
        .select('id, title, content, date, category, created_at, folder_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Se a tabela ainda não existir no Supabase remoto, fallback para localStorage
        console.warn('Tabela anotacoes não acessível no Supabase, usando cache local:', error.message);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        title: row.title || 'Sem Título',
        content: row.content || '',
        date: row.date || new Date().toISOString().split('T')[0],
        category: (row.category as 'Anotações' | 'Diário de Leitura') || 'Anotações',
        timestamp: new Date(row.created_at).getTime(),
        folderId: row.folder_id || undefined,
      }));
    } catch (e) {
      console.warn('Erro ao consultar Supabase anotacoes:', e);
      return [];
    }
  },

  // Salvar/atualizar nota
  upsertNote: async (note: Note): Promise<void> => {
    try {
      const user = await getAuthUser();
      if (!user) return;

      const payload = {
        id: note.id,
        user_id: user.id,
        title: note.title,
        content: note.content,
        date: note.date,
        category: note.category,
        folder_id: note.folderId || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('anotacoes')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Não foi possível persistir nota no Supabase remoto:', error.message);
      }
    } catch (e) {
      console.warn('Erro ao salvar nota no Supabase:', e);
    }
  },

  // Excluir nota
  deleteNote: async (noteId: string): Promise<void> => {
    try {
      const user = await getAuthUser();
      if (!user) return;

      const { error } = await supabase
        .from('anotacoes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) {
        console.warn('Erro ao excluir nota no Supabase:', error.message);
      }
    } catch (e) {}
  },

  // Listar pastas
  listFolders: async (): Promise<FolderItem[]> => {
    try {
      const user = await getAuthUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('anotacoes_pastas')
        .select('id, name, category, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) return [];

      return (data || []).map(f => ({
        id: f.id,
        name: f.name,
        category: (f.category as 'Anotações' | 'Diário de Leitura') || 'Anotações',
        createdAt: new Date(f.created_at).getTime(),
      }));
    } catch {
      return [];
    }
  },

  // Salvar pasta
  upsertFolder: async (folder: FolderItem): Promise<void> => {
    try {
      const user = await getAuthUser();
      if (!user) return;

      const { error } = await supabase
        .from('anotacoes_pastas')
        .upsert({
          id: folder.id,
          user_id: user.id,
          name: folder.name,
          category: folder.category,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) console.warn('Erro ao persistir pasta no Supabase:', error.message);
    } catch {}
  },

  // Excluir pasta
  deleteFolder: async (folderId: string): Promise<void> => {
    try {
      const user = await getAuthUser();
      if (!user) return;

      await supabase
        .from('anotacoes_pastas')
        .delete()
        .eq('id', folderId)
        .eq('user_id', user.id);
    } catch {}
  }
};
