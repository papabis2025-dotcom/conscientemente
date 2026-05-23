import React, { useState, useEffect, useMemo } from 'react';
import { StickyNote, BookOpen, Trash2, Plus, Save, LayoutTemplate, ArrowUpDown, ChevronLeft, ChevronRight, FileText, Folder, FolderPlus, Calendar } from 'lucide-react';

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
    return localStorage.getItem('isSidebarCollapsed_anotacoes') !== 'false';
  });
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Editor states
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorFolderId, setEditorFolderId] = useState<string | undefined>(undefined);

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

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  // Save notes helper
  const saveNotesToStorage = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('cn_anotacoes', JSON.stringify(updatedNotes));
  };

  // Sync state with local storage on window focus or storage change
  useEffect(() => {
    const handleFocus = () => {
      try {
        const saved = localStorage.getItem('cn_anotacoes');
        if (saved) {
          setNotes(JSON.parse(saved));
        }
      } catch (e) {}
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Handle sidebar collapse state saving
  useEffect(() => {
    localStorage.setItem('isSidebarCollapsed_anotacoes', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Set active tab to match quick note category clicked if passed in sessionStorage
  useEffect(() => {
    const requestedTab = sessionStorage.getItem('anotacoesActiveTab');
    if (requestedTab === 'Anotações' || requestedTab === 'Diário de Leitura') {
      setActiveTab(requestedTab);
      sessionStorage.removeItem('anotacoesActiveTab');
    }
  }, []);

  // Reset selected folder when active tab changes
  useEffect(() => {
    setSelectedFolderId(null);
  }, [activeTab]);

  // Create new note in editor
  const handleNewNote = () => {
    setSelectedNote(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorFolderId(selectedFolderId || undefined);
    setMobileView('editor');
  };

  // Save current note in editor
  const handleSaveNote = () => {
    if (!editorContent.trim()) return;

    const title = editorTitle.trim() || 'Sem Título';
    const today = new Date();
    const dateStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    if (selectedNote) {
      // Edit existing note
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
      // Create new note
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
  };

  // Delete current or selected note
  const handleDeleteNote = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta nota?')) {
      const updated = notes.filter(n => n.id !== id);
      saveNotesToStorage(updated);
      if (selectedNote && selectedNote.id === id) {
        handleNewNote();
      }
    }
  };

  // Select note to view/edit
  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorFolderId(note.folderId);
    setMobileView('editor');
  };

  // Folder CRUD handlers
  const handleAddFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const name = prompt('Digite o nome da nova pasta (Livro):');
    if (!name || !name.trim()) return;

    const newFolder: FolderItem = {
      id: `folder_${Date.now()}`,
      name: name.trim(),
      category: 'Diário de Leitura',
      createdAt: Date.now()
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    localStorage.setItem('cn_anotacoes_folders', JSON.stringify(updated));
  };

  const handleDeleteFolder = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta pasta? As notas associadas a ela não serão excluídas, mas ficarão sem pasta.')) {
      const updatedFolders = folders.filter(f => f.id !== id);
      setFolders(updatedFolders);
      localStorage.setItem('cn_anotacoes_folders', JSON.stringify(updatedFolders));

      // Remove folder association from notes
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

  // Filter notes by active tab/category and selected folder
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (n.category !== activeTab) return false;
      if (activeTab === 'Diário de Leitura' && selectedFolderId !== null) {
        return n.folderId === selectedFolderId;
      }
      return true;
    });
  }, [notes, activeTab, selectedFolderId]);

  // Sort notes
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (sortBy === 'title') {
        const valA = a.title.toLowerCase();
        const valB = b.title.toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        // Sort by date / timestamp
        return sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
      }
    });
  }, [filteredNotes, sortBy, sortOrder]);

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Group sorted notes by month
  const groupedNotes = useMemo(() => {
    const groups: Record<string, Note[]> = {};

    sortedNotes.forEach(note => {
      const parts = note.date.split('-');
      const year = parts[0];
      const month = parts[1];
      const key = `${year}-${month}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(note);
    });

    const keys = Object.keys(groups).sort((a, b) => {
      // Keep grouping sorting direction aligned with selected order
      return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
    });

    return keys.map(key => {
      const [year, month] = key.split('-');
      const monthName = MONTH_NAMES[parseInt(month) - 1];
      return {
        key,
        title: `${monthName} de ${year}`,
        notes: groups[key]
      };
    });
  }, [sortedNotes, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex h-screen bg-transparent text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden selection:bg-amber-200 dark:selection:bg-amber-900/50">
      
      {/* Sidebar Lateral */}
      <aside className={`relative ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white/50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 backdrop-blur-xl shrink-0`}>
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-100 shadow-sm z-50 hover:scale-110 transition-transform"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="p-5 flex-1 flex flex-col min-h-0">
          <div className={`flex items-center gap-3 text-amber-500 mb-8 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <StickyNote size={28} className="drop-shadow-sm shrink-0" />
            {!isSidebarCollapsed && (
              <span className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white animate-in fade-in slide-in-from-left-4 duration-300">
                Anotações
              </span>
            )}
          </div>

          <nav className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-1">
              <button 
                onClick={() => { setActiveTab('Anotações'); handleNewNote(); }} 
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'} rounded-xl transition-all font-semibold ${activeTab === 'Anotações' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                title={isSidebarCollapsed ? 'Anotações' : ''}
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="shrink-0" />
                  {!isSidebarCollapsed && <span>Anotações</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'Anotações' ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
                    {notes.filter(n => n.category === 'Anotações').length}
                  </span>
                )}
              </button>

              {activeTab === 'Anotações' && !isSidebarCollapsed && (
                <div className="pl-4 pr-1 py-1.5 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 pb-1 px-1">
                    <span>Pastas</span>
                    <button 
                      onClick={handleAddFolder}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-amber-500 rounded transition-all hover:scale-110"
                      title="Nova Pasta"
                    >
                      <FolderPlus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    <button
                      onClick={() => setSelectedFolderId(null)}
                      className={`w-full text-left text-xs py-1.5 px-2.5 rounded-xl font-bold transition-all truncate flex items-center gap-2 ${selectedFolderId === null ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                      <Folder size={12} className="shrink-0" />
                      <span>Todas as notas</span>
                    </button>
                    {folders.filter(f => f.category === 'Anotações').map(f => (
                      <div 
                        key={f.id} 
                        className={`group/folder flex items-center justify-between py-0.5 px-1 rounded-xl transition-all ${selectedFolderId === f.id ? 'bg-amber-500/10' : 'hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'}`}
                      >
                        <button
                          onClick={() => setSelectedFolderId(f.id)}
                          className={`text-left text-xs py-1.5 px-2 rounded-xl truncate flex-1 block font-semibold transition-all ${selectedFolderId === f.id ? 'text-amber-600 dark:text-amber-400 font-black' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                        >
                          <Folder size={11} className="inline mr-1.5 opacity-70" />{f.name}
                        </button>
                        <button
                          onClick={(e) => handleDeleteFolder(e, f.id)}
                          className="opacity-0 group-hover/folder:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded transition-all hover:scale-110 shrink-0 mr-1"
                          title="Excluir Pasta"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => { setActiveTab('Diário de Leitura'); handleNewNote(); }} 
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'} rounded-xl transition-all font-semibold ${activeTab === 'Diário de Leitura' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                title={isSidebarCollapsed ? 'Diário de Leitura' : ''}
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="shrink-0" />
                  {!isSidebarCollapsed && <span>Diário de Leitura</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'Diário de Leitura' ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
                    {notes.filter(n => n.category === 'Diário de Leitura').length}
                  </span>
                )}
              </button>

              {activeTab === 'Diário de Leitura' && !isSidebarCollapsed && (
                <div className="pl-4 pr-1 py-1.5 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 pb-1 px-1">
                    <span>Livros / Pastas</span>
                    <button 
                      onClick={handleAddFolder}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-amber-500 rounded transition-all hover:scale-110"
                      title="Nova Pasta"
                    >
                      <FolderPlus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    <button
                      onClick={() => setSelectedFolderId(null)}
                      className={`w-full text-left text-xs py-1.5 px-2.5 rounded-xl font-bold transition-all truncate flex items-center gap-2 ${selectedFolderId === null ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                      <Folder size={12} className="shrink-0" />
                      <span>Todas as notas</span>
                    </button>
                    {folders.filter(f => f.category === 'Diário de Leitura').map(f => (
                      <div 
                        key={f.id} 
                        className={`group/folder flex items-center justify-between py-0.5 px-1 rounded-xl transition-all ${selectedFolderId === f.id ? 'bg-amber-500/10' : 'hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'}`}
                      >
                        <button
                          onClick={() => setSelectedFolderId(f.id)}
                          className={`text-left text-xs py-1.5 px-2 rounded-xl truncate flex-1 block font-semibold transition-all ${selectedFolderId === f.id ? 'text-amber-600 dark:text-amber-400 font-black' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                        >
                          <Folder size={11} className="inline mr-1.5 opacity-70" />{f.name}
                        </button>
                        <button
                          onClick={(e) => handleDeleteFolder(e, f.id)}
                          className="opacity-0 group-hover/folder:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded transition-all hover:scale-110 shrink-0 mr-1"
                          title="Excluir Pasta"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="p-5 mt-auto">
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

      {/* Área Principal */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col bg-transparent">
        {/* Selector de visualização no celular */}
        <div className="lg:hidden flex bg-zinc-100/80 dark:bg-zinc-900/80 p-1 rounded-xl shrink-0 mb-3 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md">
          <button 
            type="button"
            onClick={() => setMobileView('list')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${mobileView === 'list' ? 'bg-amber-500 text-white shadow-sm font-black' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
          >
            {activeTab === 'Anotações' ? 'Ver Notas' : 'Ver Livros'}
          </button>
          <button 
            type="button"
            onClick={() => setMobileView('editor')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${mobileView === 'editor' ? 'bg-amber-500 text-white shadow-sm font-black' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
          >
            Ver Editor
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 h-full overflow-hidden max-w-[1440px] mx-auto w-full">
          
          {/* Coluna Esquerda: Listagem de Notas Minimizadas */}
          <div className={`w-full lg:w-[340px] flex-shrink-0 flex flex-col bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl shadow-xl shadow-zinc-200/5 dark:shadow-black/20 overflow-hidden ${mobileView === 'list' ? 'flex' : 'hidden lg:flex'} h-full`}>
            
            {/* Header da Lista & Ordenação */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/50 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-black uppercase tracking-widest text-zinc-400 text-xs">
                  {activeTab === 'Anotações' ? 'Notas' : 'Livros & Leituras'}
                </h2>
                
                <button
                  onClick={handleNewNote}
                  className="bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg flex items-center justify-center gap-1 transition-all text-[10px] font-black uppercase tracking-wider shadow-sm"
                >
                  <Plus size={12} strokeWidth={3} /> Criar
                </button>
              </div>

              {/* Controles de classificação */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
                  <button 
                    onClick={() => setSortBy('date')}
                    className={`flex-1 py-1 text-[9px] uppercase tracking-wider font-bold rounded-md transition-all ${sortBy === 'date' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    Data
                  </button>
                  <button 
                    onClick={() => setSortBy('title')}
                    className={`flex-1 py-1 text-[9px] uppercase tracking-wider font-bold rounded-md transition-all ${sortBy === 'title' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    Título
                  </button>
                </div>
                <button 
                  onClick={toggleSortOrder}
                  className="p-1.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-400 rounded-lg transition-colors border border-zinc-200/50 dark:border-zinc-800"
                  title={sortOrder === 'asc' ? 'Ordem Crescente' : 'Ordem Decrescente'}
                >
                  <ArrowUpDown size={12} />
                </button>
              </div>
            </div>

            {/* Lista com scroll por Mês */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {groupedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                  <StickyNote size={38} className="mb-3 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
                  <p className="text-xs font-bold">Nenhuma nota por aqui.</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Escreva sua primeira nota no editor!</p>
                </div>
              ) : (
                groupedNotes.map(group => (
                  <div key={group.key} className="space-y-1.5">
                    <div className="flex items-center gap-2 pt-1 pb-0.5">
                      <Calendar size={10} className="text-amber-500 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {group.title}
                      </span>
                      <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">{group.notes.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.notes.map(n => {
                        const isSelected = selectedNote?.id === n.id;
                        const snippet = n.content.length > 60 ? n.content.substring(0, 60) + '...' : n.content;
                        // Find folder name if note is in a folder
                        const noteFolder = folders.find(f => f.id === n.folderId);
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleSelectNote(n)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 relative group/item ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500 shadow-sm'
                                : 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 truncate pr-4">
                                  {n.title}
                                </p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug break-words">
                                  {snippet}
                                </p>
                                <div className="flex items-center justify-between mt-2.5 gap-2">
                                  <span className="flex items-center gap-1 text-[9px] font-semibold text-zinc-400 dark:text-zinc-500">
                                    <Calendar size={9} className="shrink-0" />
                                    {new Date(`${n.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                  {noteFolder && (
                                    <span className="flex items-center gap-1 text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/15 max-w-[110px] truncate">
                                      <Folder size={9} className="shrink-0" />
                                      {noteFolder.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNote(n.id);
                                }}
                                className="opacity-0 group-hover/item:opacity-100 absolute top-2 right-2 p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition-all"
                                title="Excluir nota"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Coluna Direita: Editor Bloco de Notas Windows */}
          <div className={`flex-1 flex flex-col bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl shadow-xl shadow-zinc-200/5 dark:shadow-black/20 overflow-hidden ${mobileView === 'editor' ? 'flex' : 'hidden lg:flex'} h-full`}>
            
            {/* Header do Editor */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/50 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 font-mono">
                <FileText size={12} className="text-zinc-400 dark:text-zinc-500" />
                Bloco de Notas {selectedNote ? `- ${selectedNote.title}` : '- Sem Título'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewNote}
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

              <div className="flex items-center gap-2 mt-3 pb-2 border-b border-zinc-100 dark:border-zinc-900">
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black">
                  {activeTab === 'Diário de Leitura' ? 'Livro (Pasta):' : 'Pasta:'}
                </span>
                <select
                  value={editorFolderId || ''}
                  onChange={e => setEditorFolderId(e.target.value || undefined)}
                  className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2.5 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 outline-none font-sans font-bold cursor-pointer"
                >
                  <option value="" className="bg-white dark:bg-zinc-900 text-zinc-500">Nenhuma Pasta</option>
                  {folders.filter(f => f.category === activeTab).map(f => (
                    <option key={f.id} value={f.id} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold">{f.name}</option>
                  ))}
                </select>
              </div>

              <textarea
                placeholder="Comece a digitar sua nota..."
                value={editorContent}
                onChange={e => setEditorContent(e.target.value)}
                className="w-full flex-1 bg-transparent py-4 text-xs leading-relaxed font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none resize-none custom-scrollbar focus:ring-0"
                style={{ fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace' }}
              />
            </div>
            
            {/* Status bar */}
            <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-950 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between font-mono shrink-0">
              <span>Caracteres: {editorContent.length} | Linhas: {editorContent.split('\n').length}</span>
              <span>Categoria: <span className="font-extrabold text-amber-500">{activeTab}</span></span>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
};

export default AnotacoesApp;
