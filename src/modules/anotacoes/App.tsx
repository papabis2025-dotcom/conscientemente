import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StickyNote, BookOpen, Trash2, Plus, Save, ChevronLeft, ChevronRight, FileText, Folder, FolderPlus, Calendar, Menu, Search, ArrowLeft, LayoutTemplate } from 'lucide-react';

export interface Note {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  category: 'Anotações' | 'Diário de Leitura';
  timestamp: number;
  folderId?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  category: 'Anotações' | 'Diário de Leitura';
  createdAt: number;
}

const AnotacoesApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Anotações' | 'Diário de Leitura'>('Anotações');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('global_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isSidebarCollapsed_anotacoes', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handleSidebarSync = () => {
      setIsSidebarCollapsed(localStorage.getItem('global_sidebar_collapsed') === 'true');
    };
    window.addEventListener('global-sidebar-state-changed', handleSidebarSync);
    return () => window.removeEventListener('global-sidebar-state-changed', handleSidebarSync);
  }, []);

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [currentView, setCurrentView] = useState<'library' | 'editor'>('library');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Editor states
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorFolderId, setEditorFolderId] = useState<string | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = editorContent.substring(start, end);
    const replacement = prefix + (selected || 'texto') + suffix;
    const updated = editorContent.substring(0, start) + replacement + editorContent.substring(end);
    setEditorContent(updated);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 5));
    }, 0);
  };

  // Folders state
  const [folders, setFolders] = useState<FolderItem[]>(() => {
    try {
      const saved = localStorage.getItem('cn_anotacoes_folders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Load notes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cn_anotacoes');
      if (saved) {
        setNotes(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load notes:', e);
    }
  }, []);

  const saveNotesToStorage = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('cn_anotacoes', JSON.stringify(updatedNotes));
  };

  // Sync state with local storage
  useEffect(() => {
    const handleSync = () => {
      try {
        const savedNotes = localStorage.getItem('cn_anotacoes');
        if (savedNotes) {
          setNotes(JSON.parse(savedNotes));
        }
        const savedFolders = localStorage.getItem('cn_anotacoes_folders');
        if (savedFolders) {
          setFolders(JSON.parse(savedFolders));
        }
      } catch (e) {}
    };
    window.addEventListener('focus', handleSync);
    window.addEventListener('local-storage-sync', handleSync);
    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('local-storage-sync', handleSync);
    };
  }, []);

  // Handle sidebar collapse state saving
  useEffect(() => {
    localStorage.setItem('isSidebarCollapsed_anotacoes', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const requestedTab = sessionStorage.getItem('anotacoesActiveTab');
    if (requestedTab === 'Anotações' || requestedTab === 'Diário de Leitura') {
      setActiveTab(requestedTab);
      sessionStorage.removeItem('anotacoesActiveTab');
    }
    const openAdd = sessionStorage.getItem('openAddNoteModal');
    if (openAdd === 'true') {
      handleNewNote();
      sessionStorage.removeItem('openAddNoteModal');
    }
  }, []);

  useEffect(() => {
    setSelectedFolderId(null);
  }, [activeTab]);

  // Create new note in editor
  const handleNewNote = (folderIdTarget?: string) => {
    setSelectedNote(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorFolderId(folderIdTarget || selectedFolderId || undefined);
    setCurrentView('editor');
  };

  // Save current note in editor
  const handleSaveNote = () => {
    if (!editorContent.trim()) return;

    const title = editorTitle.trim() || 'Sem Título';
    const today = new Date();
    const dateStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    if (selectedNote) {
      const updated = notes.map(n => n.id === selectedNote.id ? {
        ...n,
        title,
        content: editorContent,
        date: dateStr,
        timestamp: Date.now(),
        folderId: editorFolderId
      } : n);
      saveNotesToStorage(updated);
      setSelectedNote({
        ...selectedNote,
        title,
        content: editorContent,
        date: dateStr,
        timestamp: Date.now(),
        folderId: editorFolderId
      });
    } else {
      const newNote: Note = {
        id: `note_${Date.now()}`,
        title,
        content: editorContent,
        date: dateStr,
        category: activeTab,
        timestamp: Date.now(),
        folderId: editorFolderId
      };
      const updated = [newNote, ...notes];
      saveNotesToStorage(updated);
      setSelectedNote(newNote);
    }
    alert('Nota salva com sucesso!');
  };

  // Delete current or selected note
  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta nota?')) {
      const updated = notes.filter(n => n.id !== id);
      saveNotesToStorage(updated);
      if (selectedNote && selectedNote.id === id) {
        setSelectedNote(null);
        setCurrentView('library');
      }
      try {
        const deletedRaw = localStorage.getItem('cn_deleted_note_ids') || '[]';
        const deletedList = JSON.parse(deletedRaw);
        if (!deletedList.includes(id)) {
          deletedList.push(id);
          localStorage.setItem('cn_deleted_note_ids', JSON.stringify(deletedList));
        }
      } catch (e) {
        console.error('Error tracking deleted note:', e);
      }
    }
  };

  // Select note to view/edit
  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorFolderId(note.folderId);
    setCurrentView('editor');
  };

  // Folder CRUD handlers
  const handleAddFolder = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const promptText = activeTab === 'Diário de Leitura' ? 'Digite o nome do livro (pasta):' : 'Digite o nome da nova pasta:';
    const name = prompt(promptText);
    if (!name || !name.trim()) return;

    const newFolder: FolderItem = {
      id: `folder_${Date.now()}`,
      name: name.trim(),
      category: activeTab,
      createdAt: Date.now()
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    localStorage.setItem('cn_anotacoes_folders', JSON.stringify(updated));
  };

  const handleDeleteFolder = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta pasta? As notas associadas a ela ficarão sem pasta.')) {
      const updatedFolders = folders.filter(f => f.id !== id);
      setFolders(updatedFolders);
      localStorage.setItem('cn_anotacoes_folders', JSON.stringify(updatedFolders));

      const updatedNotes = notes.map(n => n.folderId === id ? { ...n, folderId: undefined } : n);
      saveNotesToStorage(updatedNotes);

      if (selectedFolderId === id) {
        setSelectedFolderId(null);
      }
      if (editorFolderId === id) {
        setEditorFolderId(undefined);
      }
    }
  };

  // Filtered notes by category, selected folder, and search query
  const activeTabFolders = useMemo(() => {
    return folders.filter(f => f.category === activeTab);
  }, [folders, activeTab]);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return notes.filter(n => {
      if (n.category !== activeTab) return false;
      if (selectedFolderId !== null && n.folderId !== selectedFolderId) return false;
      if (!query) return true;

      const matchesTitle = n.title.toLowerCase().includes(query);
      const matchesContent = n.content.toLowerCase().includes(query);
      const matchesDate = n.date.toLowerCase().includes(query);
      return matchesTitle || matchesContent || matchesDate;
    });
  }, [notes, activeTab, selectedFolderId, searchQuery]);

  return (
    <div className="flex h-screen bg-transparent text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden selection:bg-amber-200 dark:selection:bg-amber-900/50 relative">
      
      {/* Backdrop para mobile */}
      {!isSidebarCollapsed && (
        <div 
          onClick={() => setIsSidebarCollapsed(true)}
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200" 
        />
      )}

      {/* Botão de Menu Flutuante no Mobile */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="md:hidden fixed bottom-6 left-6 z-40 w-10 h-10 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer animate-in zoom-in duration-200"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Sidebar Lateral com Campo de Pesquisa */}
      <aside className={`fixed md:relative z-50 md:z-20 h-screen bg-white/95 dark:bg-zinc-900/95 md:bg-white/50 md:dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 backdrop-blur-xl shrink-0 ${isSidebarCollapsed ? 'w-64 md:w-20 -translate-x-full md:translate-x-0' : 'w-64 translate-x-0'}`}>
        <button
          onClick={() => {
            const next = !isSidebarCollapsed;
            setIsSidebarCollapsed(next);
            localStorage.setItem('global_sidebar_collapsed', String(next));
            localStorage.setItem('isSidebarCollapsed_anotacoes', String(next));
            window.dispatchEvent(new Event('global-sidebar-state-changed'));
          }}
          className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-100 shadow-sm z-50 hover:scale-110 transition-transform"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="p-5 flex-1 flex flex-col min-h-0">
          <div className={`flex items-center gap-3 text-amber-500 mb-6 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <StickyNote size={26} className="drop-shadow-sm shrink-0" />
            {!isSidebarCollapsed && (
              <span className="text-lg font-black uppercase tracking-widest text-zinc-900 dark:text-white animate-in fade-in slide-in-from-left-4 duration-300">
                Anotações
              </span>
            )}
          </div>

          {/* Campo de Pesquisa Lateral */}
          {!isSidebarCollapsed && (
            <div className="mb-6 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar textos, #tags, @datas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <nav className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-1">
              <button 
                onClick={() => { setActiveTab('Anotações'); setCurrentView('library'); setSelectedFolderId(null); }} 
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-2.5'} rounded-xl transition-all font-bold text-xs ${activeTab === 'Anotações' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                title={isSidebarCollapsed ? 'Anotações' : ''}
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={18} className="shrink-0" />
                  {!isSidebarCollapsed && <span>Anotações</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === 'Anotações' ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
                    {notes.filter(n => n.category === 'Anotações').length}
                  </span>
                )}
              </button>
            </div>

            <div className="space-y-1">
              <button 
                onClick={() => { setActiveTab('Diário de Leitura'); setCurrentView('library'); setSelectedFolderId(null); }} 
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-2.5'} rounded-xl transition-all font-bold text-xs ${activeTab === 'Diário de Leitura' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                title={isSidebarCollapsed ? 'Diário de Leitura' : ''}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen size={18} className="shrink-0" />
                  {!isSidebarCollapsed && <span>Diário de Leitura</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === 'Diário de Leitura' ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
                    {notes.filter(n => n.category === 'Diário de Leitura').length}
                  </span>
                )}
              </button>
            </div>

            {/* Seção de Pastas na Sidebar */}
            {!isSidebarCollapsed && (
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
                  <span>{activeTab === 'Diário de Leitura' ? 'Livros / Pastas' : 'Pastas'}</span>
                  <button 
                    onClick={handleAddFolder}
                    className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-amber-500 rounded transition-all hover:scale-110"
                    title="Nova Pasta"
                  >
                    <FolderPlus size={14} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  <button
                    onClick={() => { setSelectedFolderId(null); setCurrentView('library'); }}
                    className={`w-full text-left text-xs py-1.5 px-2.5 rounded-xl font-bold transition-all truncate flex items-center justify-between ${selectedFolderId === null ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder size={13} className="shrink-0" />
                      <span className="truncate">Todas as Notas</span>
                    </div>
                  </button>

                  {activeTabFolders.map(f => {
                    const count = notes.filter(n => n.category === activeTab && n.folderId === f.id).length;
                    return (
                      <div 
                        key={f.id} 
                        className={`group/folder flex items-center justify-between py-1 px-2.5 rounded-xl transition-all ${selectedFolderId === f.id ? 'bg-amber-500/10' : 'hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'}`}
                      >
                        <button
                          onClick={() => { setSelectedFolderId(f.id); setCurrentView('library'); }}
                          className={`text-left text-xs truncate flex-1 block font-bold transition-all flex items-center gap-2 ${selectedFolderId === f.id ? 'text-amber-600 dark:text-amber-400 font-black' : 'text-zinc-600 dark:text-zinc-400'}`}
                        >
                          <Folder size={12} className="shrink-0 text-amber-500/70" />
                          <span className="truncate">{f.name}</span>
                        </button>
                        <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 mr-1">{count}</span>
                        <button
                          onClick={(e) => handleDeleteFolder(e, f.id)}
                          className="opacity-0 group-hover/folder:opacity-100 p-0.5 text-zinc-400 hover:text-rose-500 rounded transition-all shrink-0"
                          title="Excluir Pasta"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>

          <div className="pt-4 mt-auto">
            <button 
              onClick={() => window.location.hash = ''} 
              className={`w-full flex items-center justify-center ${isSidebarCollapsed ? 'p-3' : 'gap-2 py-2.5 px-4'} bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors font-bold text-xs uppercase tracking-wider shadow-xs`}
              title="Voltar ao Hub"
            >
              <LayoutTemplate size={16} className="shrink-0 text-amber-500" />
              {!isSidebarCollapsed && <span>Voltar ao Hub</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal: Biblioteca de Pastas ou Editor de Nota */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden p-4 md:p-6">
        
        {currentView === 'library' ? (
          /* Visualização de Biblioteca de Pastas & Notas */
          <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-1 custom-scrollbar">
            
            {/* Header da Biblioteca */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm shrink-0">
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  <BookOpen className="text-amber-500" size={22} />
                  Biblioteca de {activeTab}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                  {selectedFolderId !== null 
                    ? `Exibindo notas da pasta: ${folders.find(f => f.id === selectedFolderId)?.name || 'Selecionada'}`
                    : searchQuery 
                    ? `Resultados para busca: "${searchQuery}"`
                    : 'Todas as suas notas organizadas por pastas e livros.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddFolder}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <FolderPlus size={14} className="text-amber-500" /> Nova Pasta
                </button>
                <button
                  onClick={() => handleNewNote()}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                >
                  <Plus size={14} /> Nova Nota
                </button>
              </div>
            </div>

            {/* Grade de Biblioteca de Pastas e Notas */}
            {filteredNotes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center bg-white/40 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <StickyNote size={40} className="mb-3 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
                <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Nenhuma nota encontrada.</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Crie sua primeira nota ou pasta para começar!</p>
                <button
                  onClick={() => handleNewNote()}
                  className="mt-4 bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  + Criar Nota Agora
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Seções por Pasta na Biblioteca */}
                {activeTabFolders.map(folder => {
                  const folderNotes = filteredNotes.filter(n => n.folderId === folder.id);
                  if (folderNotes.length === 0 && selectedFolderId !== folder.id && searchQuery) return null;

                  return (
                    <div key={folder.id} className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Folder size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-wider">{folder.name}</h3>
                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">{folderNotes.length} {folderNotes.length === 1 ? 'nota' : 'notas'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleNewNote(folder.id)}
                          className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-white text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Plus size={12} /> Nota nesta pasta
                        </button>
                      </div>

                      {folderNotes.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic py-3 text-center">Nenhuma nota nesta pasta ainda.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {folderNotes.map(n => (
                            <div
                              key={n.id}
                              onClick={() => handleSelectNote(n)}
                              className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-amber-500/10 hover:border-amber-500 transition-all cursor-pointer group flex flex-col justify-between space-y-3 relative shadow-2xs"
                            >
                              <div>
                                <div className="flex justify-between items-start gap-2 mb-1.5">
                                  <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-100 truncate pr-6">{n.title}</h4>
                                  <button
                                    onClick={(e) => handleDeleteNote(n.id, e)}
                                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 transition-opacity p-0.5"
                                    title="Excluir Nota"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed font-sans">
                                  {n.content}
                                </p>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-bold border-t border-zinc-100 dark:border-zinc-800/60 pt-2">
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} className="text-amber-500" />
                                  {new Date(`${n.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="text-[9px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400">Ver nota →</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Seção de Notas Sem Pasta (Se houver) */}
                {(() => {
                  const unassignedNotes = filteredNotes.filter(n => !n.folderId);
                  if (unassignedNotes.length === 0) return null;

                  return (
                    <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            <FileText size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-wider">Outras Notas (Sem Pasta)</h3>
                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">{unassignedNotes.length} notas</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {unassignedNotes.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleSelectNote(n)}
                            className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-amber-500/10 hover:border-amber-500 transition-all cursor-pointer group flex flex-col justify-between space-y-3 relative shadow-2xs"
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-1.5">
                                <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-100 truncate pr-6">{n.title}</h4>
                                <button
                                  onClick={(e) => handleDeleteNote(n.id, e)}
                                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 transition-opacity p-0.5"
                                  title="Excluir Nota"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed font-sans">
                                {n.content}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-bold border-t border-zinc-100 dark:border-zinc-800/60 pt-2">
                              <span className="flex items-center gap-1">
                                <Calendar size={10} className="text-amber-500" />
                                {new Date(`${n.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-[9px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400">Ver nota →</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}
          </div>
        ) : (
          /* Visualização do Editor de Nota */
          <div className="flex-1 flex flex-col bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl shadow-xl overflow-hidden h-full">
            
            {/* Header do Editor com Botão Voltar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/50 shrink-0">
              <button
                onClick={() => setCurrentView('library')}
                className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
              >
                <ArrowLeft size={16} /> Voltar para Biblioteca
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNewNote()}
                  className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Nova Nota
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={!editorContent.trim()}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-md shadow-amber-500/10"
                >
                  <Save size={12} /> Salvar
                </button>
              </div>
            </div>

            {/* Conteúdo do Bloco de Notas */}
            <div className="flex-1 flex flex-col p-6 bg-[#fcfaf2] dark:bg-[#16161a] border-t border-b border-zinc-200 dark:border-zinc-800 transition-colors">
              <input
                type="text"
                placeholder="Título da nota..."
                value={editorTitle}
                onChange={e => setEditorTitle(e.target.value)}
                className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-800 pb-3 text-sm font-black text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 outline-none uppercase tracking-wide"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pb-2 border-b border-zinc-100 dark:border-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black">
                    {activeTab === 'Diário de Leitura' ? 'Livro (Pasta):' : 'Pasta:'}
                  </span>
                  <select
                    value={editorFolderId || ''}
                    onChange={e => setEditorFolderId(e.target.value || undefined)}
                    className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2.5 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 outline-none font-sans font-bold cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-zinc-900 text-zinc-500">Nenhuma Pasta</option>
                    {activeTabFolders.map(f => (
                      <option key={f.id} value={f.id} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold">{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Toolbar de Formatação */}
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 select-none">
                  <button
                    type="button"
                    onClick={() => applyFormat('**', '**')}
                    className="px-2 py-0.5 rounded font-black text-xs text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                    title="Negrito (**texto**)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('*', '*')}
                    className="px-2 py-0.5 rounded italic font-serif text-xs text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                    title="Itálico (*texto*)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('<u>', '</u>')}
                    className="px-2 py-0.5 rounded underline text-xs text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                    title="Sublinhado (<u>texto</u>)"
                  >
                    U
                  </button>
                  <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => applyFormat('#')}
                    className="px-2 py-0.5 rounded text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                    title="Adicionar Hashtag (#tag)"
                  >
                    # Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('@' + new Date().toLocaleDateString('pt-BR') + ' ')}
                    className="px-2 py-0.5 rounded text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                    title="Adicionar Data (@data)"
                  >
                    @ Data
                  </button>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                placeholder="Comece a digitar sua nota... Use #tag para marcadores e @data para datas."
                value={editorContent}
                onChange={e => setEditorContent(e.target.value)}
                className="w-full flex-1 bg-transparent py-4 text-[12px] leading-relaxed font-sans text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none resize-none custom-scrollbar focus:ring-0"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', fontSize: '12px' }}
              />
            </div>
            
            {/* Status bar */}
            <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-950 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between font-mono shrink-0">
              <span>Caracteres: {editorContent.length} | Linhas: {editorContent.split('\n').length}</span>
              <span>Categoria: <span className="font-extrabold text-amber-500">{activeTab}</span></span>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default AnotacoesApp;
